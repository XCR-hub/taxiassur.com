/*
  # Correction colonne file_name dans crm_lead_documents
  
  ## Problème
  - Les fonctions RPC utilisent `file_name` 
  - Mais la table crm_lead_documents a `document_name`
  
  ## Solution
  - Mettre à jour les fonctions RPC pour utiliser `document_name`
*/

-- 1. Corriger get_prospect_documents_by_token
CREATE OR REPLACE FUNCTION public.get_prospect_documents_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  document_type text,
  file_name text,
  file_path text,
  file_size bigint,
  status text,
  uploaded_at timestamptz,
  validated_at timestamptz,
  validated_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Récupérer l'ID du lead à partir du token
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL;

  IF v_lead_id IS NULL THEN
    RETURN; -- Token invalide
  END IF;

  -- Retourner les documents du lead (utiliser document_name comme file_name)
  RETURN QUERY
  SELECT 
    d.id,
    d.lead_id,
    d.document_type,
    d.document_name as file_name,  -- CORRECTION ICI
    d.file_path,
    d.file_size,
    COALESCE(d.status, 'pending') as status,
    d.uploaded_at,
    d.validated_at,
    d.validated_by
  FROM crm_lead_documents d
  WHERE d.lead_id = v_lead_id
  ORDER BY d.uploaded_at DESC;
END;
$$;

-- 2. Corriger upload_prospect_document_by_token
CREATE OR REPLACE FUNCTION public.upload_prospect_document_by_token(
  p_token text,
  p_document_type text,
  p_file_name text,
  p_file_path text,
  p_file_size bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_document_id uuid;
BEGIN
  -- Récupérer l'ID du lead
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide';
  END IF;

  -- Créer le document (utiliser document_name au lieu de file_name)
  INSERT INTO crm_lead_documents (
    lead_id,
    document_type,
    document_name,  -- CORRECTION ICI
    file_path,
    file_size,
    status,
    uploaded_at
  )
  VALUES (
    v_lead_id,
    p_document_type,
    p_file_name,
    p_file_path,
    p_file_size,
    'pending',
    NOW()
  )
  RETURNING id INTO v_document_id;

  RETURN v_document_id;
END;
$$;