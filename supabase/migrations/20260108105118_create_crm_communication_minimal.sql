/*
  # CRM - Module Communication (version minimale)
*/

-- Templates
CREATE TABLE IF NOT EXISTS crm_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  email_subject TEXT,
  sms_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Interactions
CREATE TABLE IF NOT EXISTS crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  channel communication_channel NOT NULL,
  direction TEXT NOT NULL,
  content TEXT NOT NULL,
  msg_status message_status DEFAULT 'QUEUED',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_int_lead ON crm_interactions(lead_id);

ALTER TABLE crm_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins all templates"
  ON crm_message_templates FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins all interactions"
  ON crm_interactions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
