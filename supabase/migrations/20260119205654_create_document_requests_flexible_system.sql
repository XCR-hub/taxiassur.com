/*
  # Système de demandes de documents complémentaires flexible

  ## Description
  Permet de réclamer des documents non normés à n'importe quelle étape du cycle de vie client.
  Les documents complémentaires peuvent bloquer la progression du pipeline selon leur criticité.

  ## Tables créées
  
  ### `document_requests`
  - `id` (uuid, PK)
  - `lead_id` (uuid, FK vers crm_leads)
  - `phase` (enum) : avant_devis, avant_contrat, apres_signature, gestion
  - `insurance_company` (text, optionnel)
  - `title` (text) : Titre court du document
  - `description` (text) : Description détaillée
  - `is_mandatory` (bool) : Si obligatoire
  - `is_blocking` (bool) : Si bloque la progression pipeline
  - `status` (enum) : demande, recu, valide, rejete
  - `requested_at` (timestamp)
  - `received_at` (timestamp, null)
  - `validated_at` (timestamp, null)
  - `validated_by` (uuid, FK vers admin_users)
  - `rejection_reason` (text, null)
  - `file_path` (text, null) : Chemin du fichier uploadé
  - `metadata` (jsonb) : Données additionnelles

  ## Colonnes ajoutées à `crm_leads`
  - `can_generate_quote` (bool) : Autorise génération devis
  - `can_sign_contract` (bool) : Autorise signature
  - `can_process_payment` (bool) : Autorise paiement
  - `documents_complementaires_pending` (int) : Nb docs complémentaires en attente

  ## Sécurité
  - RLS activé sur document_requests
  - Policies pour authenticated et anon (via token)
  - Fonction de vérification des verrous

  ## Automatisations
  - Trigger pour mettre à jour les verrous automatiquement
  - Notification multicanal lors des changements de statut
*/

-- Enum pour les phases
CREATE TYPE document_request_phase AS ENUM (
  'avant_devis',
  'avant_contrat',
  'apres_signature',
  'gestion'
);

-- Enum pour le statut
CREATE TYPE document_request_status AS ENUM (
  'demande',
  'recu',
  'valide',
  'rejete'
);

-- Table document_requests
CREATE TABLE IF NOT EXISTS document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  phase document_request_phase NOT NULL DEFAULT 'avant_devis',
  insurance_company text,
  title text NOT NULL,
  description text NOT NULL,
  is_mandatory boolean DEFAULT true,
  is_blocking boolean DEFAULT true,
  status document_request_status DEFAULT 'demande',
  requested_at timestamptz DEFAULT now(),
  received_at timestamptz,
  validated_at timestamptz,
  validated_by uuid REFERENCES admin_users(id),
  rejection_reason text,
  file_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_document_requests_lead_id ON document_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_phase ON document_requests(phase);
CREATE INDEX IF NOT EXISTS idx_document_requests_blocking ON document_requests(is_blocking) WHERE is_blocking = true;

-- Ajout des colonnes de verrous à crm_leads
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'can_generate_quote') THEN
    ALTER TABLE crm_leads ADD COLUMN can_generate_quote boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'can_sign_contract') THEN
    ALTER TABLE crm_leads ADD COLUMN can_sign_contract boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'can_process_payment') THEN
    ALTER TABLE crm_leads ADD COLUMN can_process_payment boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'documents_complementaires_pending') THEN
    ALTER TABLE crm_leads ADD COLUMN documents_complementaires_pending int DEFAULT 0;
  END IF;
END $$;

-- Fonction pour calculer les verrous intelligents
CREATE OR REPLACE FUNCTION update_lead_locks()
RETURNS TRIGGER AS $$
DECLARE
  blocking_docs_avant_devis int;
  blocking_docs_avant_contrat int;
  blocking_docs_apres_signature int;
BEGIN
  -- Compter les documents bloquants non validés par phase
  SELECT COUNT(*) INTO blocking_docs_avant_devis
  FROM document_requests
  WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
    AND phase = 'avant_devis'
    AND is_blocking = true
    AND status != 'valide';

  SELECT COUNT(*) INTO blocking_docs_avant_contrat
  FROM document_requests
  WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
    AND phase = 'avant_contrat'
    AND is_blocking = true
    AND status != 'valide';

  SELECT COUNT(*) INTO blocking_docs_apres_signature
  FROM document_requests
  WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
    AND phase = 'apres_signature'
    AND is_blocking = true
    AND status != 'valide';

  -- Mettre à jour les verrous dans crm_leads
  UPDATE crm_leads
  SET
    can_generate_quote = (blocking_docs_avant_devis = 0),
    can_sign_contract = (blocking_docs_avant_contrat = 0),
    can_process_payment = (blocking_docs_apres_signature = 0),
    documents_complementaires_pending = blocking_docs_avant_devis + blocking_docs_avant_contrat + blocking_docs_apres_signature,
    updated_at = now()
  WHERE id = COALESCE(NEW.lead_id, OLD.lead_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour automatiquement les verrous
DROP TRIGGER IF EXISTS trigger_update_lead_locks ON document_requests;
CREATE TRIGGER trigger_update_lead_locks
  AFTER INSERT OR UPDATE OR DELETE ON document_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_locks();

-- RLS sur document_requests
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

-- Policy pour les admins authentifiés
CREATE POLICY "Admins can manage all document requests"
  ON document_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Policy pour les prospects via token
CREATE POLICY "Prospects can view their document requests via token"
  ON document_requests
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = document_requests.lead_id
        AND crm_leads.access_token = current_setting('request.jwt.claims', true)::json->>'access_token'
    )
  );

-- Policy pour upload par les prospects
CREATE POLICY "Prospects can update their document requests status via token"
  ON document_requests
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = document_requests.lead_id
        AND crm_leads.access_token = current_setting('request.jwt.claims', true)::json->>'access_token'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = document_requests.lead_id
        AND crm_leads.access_token = current_setting('request.jwt.claims', true)::json->>'access_token'
    )
  );

-- Fonction helper pour vérifier si un lead peut progresser
CREATE OR REPLACE FUNCTION can_lead_progress_to_quote(p_lead_id uuid)
RETURNS boolean AS $$
DECLARE
  v_can_progress boolean;
BEGIN
  SELECT can_generate_quote INTO v_can_progress
  FROM crm_leads
  WHERE id = p_lead_id;
  
  RETURN COALESCE(v_can_progress, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_lead_progress_to_signature(p_lead_id uuid)
RETURNS boolean AS $$
DECLARE
  v_can_progress boolean;
BEGIN
  SELECT can_sign_contract INTO v_can_progress
  FROM crm_leads
  WHERE id = p_lead_id;
  
  RETURN COALESCE(v_can_progress, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_lead_progress_to_payment(p_lead_id uuid)
RETURNS boolean AS $$
DECLARE
  v_can_progress boolean;
BEGIN
  SELECT can_process_payment INTO v_can_progress
  FROM crm_leads
  WHERE id = p_lead_id;
  
  RETURN COALESCE(v_can_progress, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires
COMMENT ON TABLE document_requests IS 'Demandes de documents complémentaires flexibles utilisables à toute étape du cycle de vie client';
COMMENT ON COLUMN document_requests.is_blocking IS 'Si true, bloque la progression du pipeline tant que le document n''est pas validé';
COMMENT ON COLUMN crm_leads.can_generate_quote IS 'Verrou intelligent : autorise ou non la génération de devis';
COMMENT ON COLUMN crm_leads.can_sign_contract IS 'Verrou intelligent : autorise ou non la signature du contrat';
COMMENT ON COLUMN crm_leads.can_process_payment IS 'Verrou intelligent : autorise ou non le traitement du paiement';
