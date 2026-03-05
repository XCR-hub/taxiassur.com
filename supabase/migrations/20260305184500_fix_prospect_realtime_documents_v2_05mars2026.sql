/*
  # Fix Prospect Realtime Documents - Le prospect voit ses documents avec statuts

  ## Problème
  - Le prospect uploade un document
  - Le document est bien créé dans crm_lead_documents
  - MAIS le prospect ne le voit pas dans son espace
  - Parce que le realtime écoute prospect_documents au lieu de crm_lead_documents

  ## Solution
  1. Vérifier les RLS pour que anon puisse lire ses propres documents via token
  2. Améliorer les fonctions RPC pour retourner les statuts
  3. Le frontend doit écouter crm_lead_documents au lieu de prospect_documents
*/

-- ============================================
-- 1. RLS POUR ACCÈS ANON VIA TOKEN
-- ============================================

-- Permettre aux anonymes de lire les documents via le token du lead
DROP POLICY IF EXISTS "Anon can read documents via token" ON crm_lead_documents;
CREATE POLICY "Anon can read documents via token"
  ON crm_lead_documents
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_lead_documents.lead_id
        AND crm_leads.access_token IS NOT NULL
        AND LENGTH(crm_leads.access_token) > 0
        AND crm_leads.deleted_at IS NULL
    )
  );

-- ============================================
-- 2. AMÉLIORER LA FONCTION GET DOCUMENTS
-- ============================================

DROP FUNCTION IF EXISTS public.get_lead_documents_by_token(text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_lead_documents_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  document_type text,
  file_name text,
  file_path text,
  file_url text,
  file_size bigint,
  uploaded_at timestamptz,
  status text,
  validated boolean,
  validated_at timestamptz,
  refusal_reason text,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Trouver le lead
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.document_type,
    COALESCE(d.document_name, d.file_path) as file_name,
    d.file_path,
    d.file_url,
    d.file_size,
    d.uploaded_at,
    COALESCE(d.status, 'pending')::text as status,
    COALESCE(d.validated, false) as validated,
    d.validated_at,
    d.refusal_reason,
    d.notes
  FROM crm_lead_documents d
  WHERE d.lead_id = v_lead_id
    AND d.deleted_at IS NULL
  ORDER BY d.uploaded_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_documents_by_token(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_lead_documents_by_token(text) IS
'Retourne TOUS les documents du lead avec leurs statuts (pending, validated, refused)';

-- ============================================
-- 3. METTRE À JOUR LES COMPTEURS DÉTAILLÉS
-- ============================================

-- Ajouter les colonnes de compteurs détaillés si elles n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'total_uploaded_files') THEN
    ALTER TABLE crm_leads ADD COLUMN total_uploaded_files integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'validated_files') THEN
    ALTER TABLE crm_leads ADD COLUMN validated_files integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'rejected_files') THEN
    ALTER TABLE crm_leads ADD COLUMN rejected_files integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'pending_files') THEN
    ALTER TABLE crm_leads ADD COLUMN pending_files integer DEFAULT 0;
  END IF;
END $$;

-- Fonction pour mettre à jour les compteurs automatiquement
CREATE OR REPLACE FUNCTION update_lead_document_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE crm_leads
  SET
    total_uploaded_files = (
      SELECT COUNT(*)
      FROM crm_lead_documents
      WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
        AND deleted_at IS NULL
    ),
    validated_files = (
      SELECT COUNT(*)
      FROM crm_lead_documents
      WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
        AND validated = true
        AND deleted_at IS NULL
    ),
    rejected_files = (
      SELECT COUNT(*)
      FROM crm_lead_documents
      WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
        AND status = 'refused'
        AND deleted_at IS NULL
    ),
    pending_files = (
      SELECT COUNT(*)
      FROM crm_lead_documents
      WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
        AND status = 'pending'
        AND validated = false
        AND deleted_at IS NULL
    )
  WHERE id = COALESCE(NEW.lead_id, OLD.lead_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_document_counters ON crm_lead_documents;
CREATE TRIGGER trigger_update_document_counters
  AFTER INSERT OR UPDATE OR DELETE ON crm_lead_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_document_counters();

-- Mettre à jour get_lead_by_token pour inclure les compteurs détaillés
DROP FUNCTION IF EXISTS public.get_lead_by_token(text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_lead_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_result jsonb;
  v_total_docs integer := 7;
  v_uploaded_docs integer;
  v_validated_docs integer;
  v_progression integer;
BEGIN
  -- Trouver le lead
  SELECT id INTO v_lead_id
  FROM crm_leads
  WHERE access_token = p_token
    AND deleted_at IS NULL;

  IF v_lead_id IS NULL THEN
    RAISE NOTICE 'No lead found for token: %', p_token;
    RETURN jsonb_build_object('lead', NULL);
  END IF;

  -- Calculer les documents uploadés (types distincts)
  SELECT COUNT(DISTINCT document_type) INTO v_uploaded_docs
  FROM crm_lead_documents
  WHERE lead_id = v_lead_id
    AND document_type IN (
      'licence_taxi', 'permis_conduire', 'piece_identite',
      'carte_grise', 'releve_information', 'autorisation_stationnement', 'rib'
    )
    AND status != 'refused'
    AND deleted_at IS NULL;

  -- Calculer les documents validés (types distincts)
  SELECT COUNT(DISTINCT document_type) INTO v_validated_docs
  FROM crm_lead_documents
  WHERE lead_id = v_lead_id
    AND document_type IN (
      'licence_taxi', 'permis_conduire', 'piece_identite',
      'carte_grise', 'releve_information', 'autorisation_stationnement', 'rib'
    )
    AND validated = true
    AND deleted_at IS NULL;

  v_uploaded_docs := COALESCE(v_uploaded_docs, 0);
  v_validated_docs := COALESCE(v_validated_docs, 0);
  v_progression := CASE
    WHEN v_total_docs > 0 THEN ROUND((v_validated_docs::numeric / v_total_docs::numeric) * 100)
    ELSE 0
  END;

  -- Construire le résultat
  SELECT jsonb_build_object(
    'lead', jsonb_build_object(
      'id', cl.id,
      'first_name', cl.first_name,
      'last_name', cl.last_name,
      'email', cl.email,
      'phone', cl.phone,
      'address', cl.address,
      'postal_code', cl.postal_code,
      'city', cl.city,
      'company_name', cl.company_name,
      'siret', cl.siret,
      'status', cl.status,
      'pipeline_stage', cl.pipeline_stage,
      'current_stage_key', cl.pipeline_stage,
      'documents_complete', (v_validated_docs >= v_total_docs),
      'progression_percentage', v_progression,
      'total_documents', v_total_docs,
      'uploaded_documents', v_uploaded_docs,
      'validated_documents', v_validated_docs,
      'total_uploaded_files', COALESCE(cl.total_uploaded_files, 0),
      'validated_files', COALESCE(cl.validated_files, 0),
      'rejected_files', COALESCE(cl.rejected_files, 0),
      'pending_files', COALESCE(cl.pending_files, 0),
      'quote_accepted_at', cl.quote_accepted_at,
      'contract_signed_at', cl.contract_signed_at,
      'payment_completed_at', cl.payment_completed_at,
      'converted_to_client', COALESCE(cl.converted_to_client, false),
      'client_since', cl.client_since,
      'created_at', cl.created_at,
      'updated_at', cl.updated_at
    )
  ) INTO v_result
  FROM crm_leads cl
  WHERE cl.id = v_lead_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_lead_by_token(text) IS
'Retourne le lead avec tous ses compteurs de documents détaillés';