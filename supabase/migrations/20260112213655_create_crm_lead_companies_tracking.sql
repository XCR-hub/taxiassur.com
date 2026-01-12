/*
  # Table de suivi des compagnies par lead

  1. Nouvelle Table
    - `crm_lead_companies` : Association lead <-> compagnies avec statut

  2. Sécurité
    - RLS activé
    - Policies pour authentifiés

  3. Fonctionnalités
    - Tracking statut (contacted, quoted, accepted, rejected)
    - Montant devis
    - Dates clés
    - Notes
*/

-- Table de tracking compagnies par lead
CREATE TABLE IF NOT EXISTS crm_lead_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES insurance_companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'contacted' CHECK (status IN ('contacted', 'quoted', 'accepted', 'rejected', 'pending')),
  quote_amount numeric(10,2),
  quote_sent_at timestamptz,
  response_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, company_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_lead_companies_lead ON crm_lead_companies(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_companies_company ON crm_lead_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_companies_status ON crm_lead_companies(status);

-- RLS
ALTER TABLE crm_lead_companies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Lead companies lisibles par authentifiés"
  ON crm_lead_companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Lead companies modifiables par authentifiés"
  ON crm_lead_companies FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE crm_lead_companies IS 'Association entre leads et compagnies d''assurance avec statut de suivi';
