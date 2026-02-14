/*
  # Fonctions Helper pour Espace Prospect

  ## Fonctions créées
  1. get_prospect_documents_by_token - Liste des documents uploadés
  2. upload_prospect_document_by_token - Upload d'un document
  
  Ces fonctions permettent l'accès anonyme via token
*/

-- 1. Fonction pour récupérer les documents d'un prospect
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

  -- Retourner les documents du lead
  RETURN QUERY
  SELECT 
    d.id,
    d.lead_id,
    d.document_type,
    d.file_name,
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

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_prospect_documents_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_prospect_documents_by_token(text) TO authenticated;

-- 2. Fonction pour uploader un document via token
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

  -- Créer le document
  INSERT INTO crm_lead_documents (
    lead_id,
    document_type,
    file_name,
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

-- Permissions
GRANT EXECUTE ON FUNCTION public.upload_prospect_document_by_token(text, text, text, text, bigint) TO anon;
GRANT EXECUTE ON FUNCTION public.upload_prospect_document_by_token(text, text, text, text, bigint) TO authenticated;

-- Commentaires
COMMENT ON FUNCTION public.get_prospect_documents_by_token IS 
'Récupère la liste des documents uploadés par un prospect via son token';

COMMENT ON FUNCTION public.upload_prospect_document_by_token IS 
'Permet à un prospect d''uploader un document via son token d''accès';
