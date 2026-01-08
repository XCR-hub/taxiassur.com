/*
  # CRM TaxiAssur - Module Sinistres & Assistance

  ## Tables

  1. crm_claims - Déclarations de sinistres
  2. crm_assistance_requests - Demandes d'assistance routière
*/

-- Table sinistres
CREATE TABLE IF NOT EXISTS crm_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES crm_contracts(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL UNIQUE,
  claim_type TEXT NOT NULL CHECK (claim_type IN (
    'ACCIDENT_RESPONSABLE',
    'ACCIDENT_NON_RESPONSABLE',
    'VOL',
    'INCENDIE',
    'BRIS_GLACE',
    'VANDALISME',
    'CATASTROPHE_NATURELLE',
    'DOMMAGES_COLLISION',
    'ASSISTANCE',
    'AUTRE'
  )),
  incident_date DATE NOT NULL,
  incident_location TEXT,
  incident_description TEXT NOT NULL,
  estimated_amount DECIMAL(10, 2),
  final_amount DECIMAL(10, 2),
  claim_status TEXT DEFAULT 'DECLARED' CHECK (claim_status IN (
    'DECLARED',
    'DOCUMENTS_PENDING',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'PAID',
    'CLOSED'
  )),
  assigned_to UUID REFERENCES admin_users(id),
  police_report_id UUID REFERENCES crm_documents(id),
  declared_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  internal_notes TEXT,
  client_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claims_client ON crm_claims(client_id);
CREATE INDEX IF NOT EXISTS idx_claims_contract ON crm_claims(contract_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON crm_claims(claim_status);
CREATE INDEX IF NOT EXISTS idx_claims_number ON crm_claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_claims_date ON crm_claims(incident_date DESC);

-- Table demandes assistance
CREATE TABLE IF NOT EXISTS crm_assistance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES crm_contracts(id) ON DELETE SET NULL,
  assistance_type TEXT NOT NULL CHECK (assistance_type IN (
    'PANNE',
    'ACCIDENT',
    'DEPANNAGE',
    'REMORQUAGE',
    'VEHICULE_REMPLACEMENT',
    'RAPATRIEMENT',
    'ASSISTANCE_MEDICALE',
    'AUTRE'
  )),
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT NOT NULL,
  urgency TEXT DEFAULT 'NORMAL' CHECK (urgency IN ('LOW', 'NORMAL', 'HIGH', 'EMERGENCY')),
  assist_status TEXT DEFAULT 'REQUESTED' CHECK (assist_status IN (
    'REQUESTED',
    'DISPATCHED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
  )),
  provider_name TEXT,
  provider_eta TIMESTAMPTZ,
  provider_arrival_time TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cost DECIMAL(10, 2),
  notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assist_client ON crm_assistance_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_assist_status ON crm_assistance_requests(assist_status);
CREATE INDEX IF NOT EXISTS idx_assist_urgency ON crm_assistance_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_assist_requested ON crm_assistance_requests(requested_at DESC);

-- RLS
ALTER TABLE crm_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_assistance_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins claims acces complet"
  ON crm_claims FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('ADMIN', 'MANAGER', 'CLAIMS')
    )
  );

CREATE POLICY "Admins assist acces complet"
  ON crm_assistance_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('ADMIN', 'MANAGER', 'SUPPORT')
    )
  );

-- Triggers
CREATE TRIGGER update_crm_claims_updated_at BEFORE UPDATE ON crm_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_assistance_updated_at BEFORE UPDATE ON crm_assistance_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE crm_claims IS 'Déclarations de sinistres avec workflow complet';
COMMENT ON TABLE crm_assistance_requests IS 'Demandes d''assistance routière avec tracking temps réel';
