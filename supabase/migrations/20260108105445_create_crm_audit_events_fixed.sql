/*
  # CRM TaxiAssur - Module Audit, Events & RGPD (version fixée)
*/

-- Créer type user_role si nécessaire
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'MANAGER',
    'SALES',
    'PRODUCTION',
    'CLAIMS',
    'SUPPORT',
    'READ_ONLY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Table audit logs
CREATE TABLE IF NOT EXISTS crm_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  rationale TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON crm_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON crm_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON crm_audit_logs(created_at DESC);

-- Table événements
CREATE TABLE IF NOT EXISTS crm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type event_type NOT NULL,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('SYSTEM', 'USER', 'EXTERNAL', 'WORKFLOW', 'AI')),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON crm_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_lead ON crm_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_events_processed ON crm_events(processed) WHERE processed = false;

-- Table RGPD
CREATE TABLE IF NOT EXISTS crm_gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN (
    'ACCESS', 'RECTIFICATION', 'ERASURE', 'RESTRICTION', 'PORTABILITY', 'OBJECTION'
  )),
  gdpr_status TEXT DEFAULT 'PENDING' CHECK (gdpr_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')),
  assigned_to UUID REFERENCES admin_users(id),
  processed_at TIMESTAMPTZ,
  result_notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (lead_id IS NOT NULL OR client_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_gdpr_lead ON crm_gdpr_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_status ON crm_gdpr_requests(gdpr_status);

-- Table notes
CREATE TABLE IF NOT EXISTS crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES admin_users(id),
  note_type TEXT DEFAULT 'GENERAL',
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (lead_id IS NOT NULL OR client_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_notes_lead ON crm_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_notes_client ON crm_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON crm_notes(created_by);

-- RLS
ALTER TABLE crm_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins lisent audit"
  ON crm_audit_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins gerent events"
  ON crm_events FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins gerent RGPD"
  ON crm_gdpr_requests FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Users lisent notes"
  ON crm_notes FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Users creent notes"
  ON crm_notes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

COMMENT ON TABLE crm_audit_logs IS 'Journal d''audit immuable';
COMMENT ON TABLE crm_events IS 'Événements système';
COMMENT ON TABLE crm_gdpr_requests IS 'Demandes RGPD';
COMMENT ON TABLE crm_notes IS 'Notes internes';
