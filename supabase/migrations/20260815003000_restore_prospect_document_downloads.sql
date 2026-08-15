-- Restore the legacy prospect document page on the current storage schema.
DROP FUNCTION IF EXISTS public.get_prospect_documents_by_token(text);

CREATE FUNCTION public.get_prospect_documents_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  document_type text,
  document_name text,
  file_path text,
  file_url text,
  file_size bigint,
  status text,
  validated boolean,
  uploaded_at timestamptz,
  validated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pd.id,
    pd.lead_id,
    COALESCE(pd.document_type, 'autre'),
    COALESCE(pd.file_name, 'Document'),
    pd.file_path,
    COALESCE(pd.file_url, pd.file_path),
    COALESCE(pd.file_size, 0)::bigint,
    COALESCE(pd.status, 'pending'),
    COALESCE(pd.validated, false),
    COALESCE(pd.uploaded_at, pd.created_at),
    pd.validated_at
  FROM public.crm_leads AS lead
  JOIN public.prospect_documents AS pd ON pd.lead_id = lead.id
  WHERE p_token ~ '^[0-9A-Fa-f]{64}$'
    AND lead.access_token = p_token
    AND lead.deleted_at IS NULL
  ORDER BY COALESCE(pd.uploaded_at, pd.created_at) DESC
$$;

REVOKE ALL ON FUNCTION public.get_prospect_documents_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_prospect_documents_by_token(text)
  TO anon, authenticated, service_role;
