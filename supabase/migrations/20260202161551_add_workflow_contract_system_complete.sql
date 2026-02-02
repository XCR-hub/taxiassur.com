/*
  # Système de workflow complet pour contrats

  1. Modifications
    - Ajout colonne company_id à contract_documents (optionnel)
    - Nouvelles tables pour signatures et paiements

  2. Nouvelles Tables
    - `lead_contract_signatures` : Signatures électroniques
    - `lead_contract_payments` : Gestion des paiements/comptants
*/

-- Ajouter company_id à contract_documents si pas déjà présent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contract_documents' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE contract_documents
    ADD COLUMN company_id uuid REFERENCES insurance_companies(id);
  END IF;
END $$;

-- Table des signatures électroniques pour contrats
CREATE TABLE IF NOT EXISTS lead_contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  document_id uuid REFERENCES contract_documents(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES insurance_companies(id) ON DELETE CASCADE,
  
  -- Type de document signé
  signature_type text NOT NULL CHECK (signature_type IN ('devis', 'contrat', 'mandat_sepa', 'conditions_generales')),
  
  -- Données de signature
  signature_data text NOT NULL, -- Base64 image de la signature
  ip_address inet,
  user_agent text,
  geolocation jsonb,
  
  -- Identité du signataire
  signed_by_name text NOT NULL,
  signed_by_email text NOT NULL,
  signed_by_phone text,
  
  -- Validation
  signed_at timestamptz DEFAULT now(),
  is_verified boolean DEFAULT true,
  verification_code text,
  
  -- Métadonnées
  metadata jsonb,
  
  created_at timestamptz DEFAULT now()
);

-- Table des paiements et comptants
CREATE TABLE IF NOT EXISTS lead_contract_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES insurance_companies(id) ON DELETE CASCADE,
  
  -- Type de paiement
  payment_type text NOT NULL CHECK (payment_type IN ('comptant', 'premier_mois', 'frais_dossier', 'acompte')),
  
  -- Montant
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'EUR',
  
  -- Méthode de paiement
  payment_method text NOT NULL CHECK (payment_method IN (
    'cb_direct_compagnie', 
    'prelevement_compagnie', 
    'cb_taxiassur_stripe', 
    'cb_taxiassur_cic',
    'virement', 
    'cheque',
    'especes'
  )),
  
  -- Workflow spécifique
  managed_by text NOT NULL CHECK (managed_by IN ('grossiste', 'taxiassur')),
  
  -- Statut
  status text DEFAULT 'pending' CHECK (status IN (
    'pending', 
    'awaiting_confirmation', 
    'completed', 
    'failed', 
    'refunded', 
    'cancelled'
  )),
  
  -- Détails transaction
  payment_date date,
  transaction_reference text,
  
  -- Stripe (si géré par TaxiAssur)
  stripe_payment_intent_id text,
  stripe_charge_id text,
  
  -- CIC Monetico (si géré par TaxiAssur)
  cic_payment_reference text,
  cic_transaction_id text,
  
  -- Prélèvement SEPA
  iban text,
  bic text,
  mandate_reference text,
  mandate_signed_at timestamptz,
  
  -- Notes
  notes text,
  internal_notes text,
  
  -- Métadonnées
  metadata jsonb,
  
  -- Timestamps
  paid_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_lead_contract_signatures_lead ON lead_contract_signatures(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_contract_signatures_company ON lead_contract_signatures(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_contract_signatures_document ON lead_contract_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_lead_contract_signatures_type ON lead_contract_signatures(signature_type);

CREATE INDEX IF NOT EXISTS idx_lead_contract_payments_lead ON lead_contract_payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_contract_payments_company ON lead_contract_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_contract_payments_status ON lead_contract_payments(status);
CREATE INDEX IF NOT EXISTS idx_lead_contract_payments_managed_by ON lead_contract_payments(managed_by);

-- RLS
ALTER TABLE lead_contract_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_contract_payments ENABLE ROW LEVEL SECURITY;

-- Policies pour lead_contract_signatures
CREATE POLICY "Authenticated users can view signatures"
  ON lead_contract_signatures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage signatures"
  ON lead_contract_signatures FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Prospects peuvent signer via token
CREATE POLICY "Prospects can create signatures via token"
  ON lead_contract_signatures FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = lead_contract_signatures.lead_id
        AND crm_leads.access_token IS NOT NULL
        AND crm_leads.access_token = current_setting('request.headers', true)::json->>'x-lead-token'
    )
  );

CREATE POLICY "Prospects can view their signatures via token"
  ON lead_contract_signatures FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = lead_contract_signatures.lead_id
        AND crm_leads.access_token IS NOT NULL
        AND crm_leads.access_token = current_setting('request.headers', true)::json->>'x-lead-token'
    )
  );

-- Policies pour lead_contract_payments
CREATE POLICY "Authenticated users can view payments"
  ON lead_contract_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage payments"
  ON lead_contract_payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Prospects peuvent voir leurs paiements via token
CREATE POLICY "Prospects can view their payments via token"
  ON lead_contract_payments FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = lead_contract_payments.lead_id
        AND crm_leads.access_token IS NOT NULL
        AND crm_leads.access_token = current_setting('request.headers', true)::json->>'x-lead-token'
    )
  );

-- Trigger pour updated_at sur payments
CREATE OR REPLACE FUNCTION update_lead_contract_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_contract_payments_updated_at
  BEFORE UPDATE ON lead_contract_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_contract_payments_updated_at();

-- Fonction helper pour obtenir le workflow d'une compagnie
CREATE OR REPLACE FUNCTION get_company_workflow_type(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workflow text;
BEGIN
  SELECT workflow_type INTO v_workflow
  FROM insurance_companies
  WHERE id = p_company_id;
  
  RETURN COALESCE(v_workflow, 'grossiste');
END;
$$;
