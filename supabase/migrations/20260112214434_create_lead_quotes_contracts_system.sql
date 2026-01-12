/*
  # Système de gestion des devis et contrats par lead

  1. Nouvelle Table
    - `lead_quotes_contracts` : Stockage des devis et contrats spécifiques par lead

  2. Sécurité
    - RLS activé
    - Policies pour authentifiés

  3. Fonctionnalités
    - Upload de devis par compagnie
    - Upload de contrats signés
    - Tracking des versions
    - Historique complet
*/

-- Table des devis et contrats par lead
CREATE TABLE IF NOT EXISTS lead_quotes_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  company_id uuid REFERENCES insurance_companies(id) ON DELETE SET NULL,
  document_type text NOT NULL CHECK (document_type IN ('devis', 'contrat', 'avenant', 'attestation')),
  document_name text NOT NULL,
  file_path text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  mime_type text,
  version integer DEFAULT 1,
  amount numeric(10,2),
  valid_from date,
  valid_until date,
  is_signed boolean DEFAULT false,
  signed_at timestamptz,
  signed_by text,
  sent_to_client boolean DEFAULT false,
  sent_at timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'active', 'archived')),
  notes text,
  uploaded_by uuid REFERENCES admin_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_lead_quotes_lead ON lead_quotes_contracts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_quotes_company ON lead_quotes_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_quotes_type ON lead_quotes_contracts(document_type);
CREATE INDEX IF NOT EXISTS idx_lead_quotes_status ON lead_quotes_contracts(status);
CREATE INDEX IF NOT EXISTS idx_lead_quotes_signed ON lead_quotes_contracts(is_signed);

-- RLS
ALTER TABLE lead_quotes_contracts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Quotes contracts lisibles par authentifiés"
  ON lead_quotes_contracts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Quotes contracts modifiables par authentifiés"
  ON lead_quotes_contracts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction pour obtenir le dernier devis d'un lead par compagnie
CREATE OR REPLACE FUNCTION get_latest_quote_by_company(p_lead_id uuid, p_company_id uuid)
RETURNS TABLE (
  id uuid,
  document_name text,
  file_url text,
  amount numeric,
  created_at timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lqc.id,
    lqc.document_name,
    lqc.file_url,
    lqc.amount,
    lqc.created_at,
    lqc.status
  FROM lead_quotes_contracts lqc
  WHERE lqc.lead_id = p_lead_id
    AND lqc.company_id = p_company_id
    AND lqc.document_type = 'devis'
  ORDER BY lqc.version DESC, lqc.created_at DESC
  LIMIT 1;
END;
$$;

-- Fonction pour obtenir tous les documents d'un lead
CREATE OR REPLACE FUNCTION get_lead_all_documents(p_lead_id uuid)
RETURNS TABLE (
  id uuid,
  company_name text,
  document_type text,
  document_name text,
  file_url text,
  amount numeric,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lqc.id,
    COALESCE(ic.name, 'Non spécifiée') as company_name,
    lqc.document_type,
    lqc.document_name,
    lqc.file_url,
    lqc.amount,
    lqc.status,
    lqc.created_at
  FROM lead_quotes_contracts lqc
  LEFT JOIN insurance_companies ic ON ic.id = lqc.company_id
  WHERE lqc.lead_id = p_lead_id
  ORDER BY lqc.created_at DESC;
END;
$$;

COMMENT ON TABLE lead_quotes_contracts IS 'Devis et contrats spécifiques par lead et compagnie';
COMMENT ON FUNCTION get_latest_quote_by_company IS 'Récupère le dernier devis d''un lead pour une compagnie donnée';
COMMENT ON FUNCTION get_lead_all_documents IS 'Récupère tous les documents (devis, contrats, etc.) d''un lead';
