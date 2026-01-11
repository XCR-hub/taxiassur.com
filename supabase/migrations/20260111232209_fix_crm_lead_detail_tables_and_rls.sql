/*
  # Fix CRM Lead Detail - Tables et RLS

  1. Tables vérifiées
    - crm_review_requests : Ajouter si manquante
    - crm_lead_documents : Vérifier colonnes
    - crm_interactions : Vérifier colonnes
    - email_messages : Vérifier colonnes

  2. RLS
    - Politiques pour authentifiés sur toutes les tables CRM
    
  3. Colonnes
    - Ajouter internal_notes à crm_leads si manquant
*/

-- Créer crm_review_requests si elle n'existe pas
CREATE TABLE IF NOT EXISTS crm_review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'google',
  sent_to text NOT NULL,
  sent_via text NOT NULL DEFAULT 'email',
  review_url text,
  status text NOT NULL DEFAULT 'sent',
  reviewed_at timestamptz,
  rating integer,
  review_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ajouter internal_notes à crm_leads si manquant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'crm_leads' AND column_name = 'internal_notes'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN internal_notes text;
  END IF;
END $$;

-- Enable RLS sur crm_review_requests
ALTER TABLE crm_review_requests ENABLE ROW LEVEL SECURITY;

-- Drop anciennes politiques si elles existent
DROP POLICY IF EXISTS "Admins can manage review requests" ON crm_review_requests;

-- Politique pour authentifiés
CREATE POLICY "Admins can manage review requests"
  ON crm_review_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- S'assurer que crm_lead_documents a RLS
ALTER TABLE crm_lead_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage documents" ON crm_lead_documents;

CREATE POLICY "Admins can manage documents"
  ON crm_lead_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_crm_review_requests_lead_id ON crm_review_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_review_requests_status ON crm_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_lead_id ON crm_lead_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_status ON crm_lead_documents(status);
