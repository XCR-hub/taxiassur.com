/*
  # Créer get_lead_documents_by_token - 20 février 2026

  ## Fonction manquante

  La fonction `get_lead_documents_by_token` est utilisée par le frontend
  mais n'existe pas dans la base de données.

  ## Solution

  Créer la fonction RPC qui retourne les documents d'un lead via son token
*/

-- Créer la fonction
CREATE OR REPLACE FUNCTION public.get_lead_documents_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  document_type text,
  file_name text,
  file_path text,
  file_size integer,
  mime_type text,
  status text,
  uploaded_by text,
  uploaded_at timestamptz,
  validated_by text,
  validated_at timestamptz,
  rejection_reason text,
  notes text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  bucket text,
  custom_label text,
  file_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Récupérer l'ID du lead via le token
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND (l.is_archived IS NULL OR l.is_archived = false)
  LIMIT 1;

  -- Si le lead n'existe pas, retourner vide
  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  -- Retourner tous les documents du lead
  RETURN QUERY
  SELECT
    d.id,
    d.lead_id,
    d.document_type,
    d.file_name,
    d.file_path,
    d.file_size,
    d.mime_type,
    d.status,
    d.uploaded_by,
    d.uploaded_at,
    d.validated_by,
    d.validated_at,
    d.rejection_reason,
    d.notes,
    d.metadata,
    d.created_at,
    d.updated_at,
    d.bucket,
    d.custom_label,
    d.file_url
  FROM crm_lead_documents d
  WHERE d.lead_id = v_lead_id
  ORDER BY d.created_at DESC;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_lead_documents_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_lead_documents_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_documents_by_token(text) TO service_role;

COMMENT ON FUNCTION public.get_lead_documents_by_token IS
'Récupère tous les documents d''un lead par son access_token';
