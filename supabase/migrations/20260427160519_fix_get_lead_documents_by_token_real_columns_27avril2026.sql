/*
  # Fix get_lead_documents_by_token to use real columns

  1. Issue
    - Function referenced non-existent columns (document_name, deleted_at, validated, refusal_reason)
    - Prospects could not see their uploaded or commercial-validated documents

  2. Fix
    - Drop and recreate with correct column references on crm_lead_documents
    - Add custom_label and computed file_url for public URLs
*/

DROP FUNCTION IF EXISTS public.get_lead_documents_by_token(text);

CREATE FUNCTION public.get_lead_documents_by_token(p_token text)
RETURNS TABLE(
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
  notes text,
  custom_label text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
  v_supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
BEGIN
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.document_type,
    COALESCE(d.file_name, d.file_path) AS file_name,
    d.file_path,
    COALESCE(
      d.file_url,
      CASE WHEN d.file_path IS NOT NULL
        THEN v_supabase_url || '/storage/v1/object/public/' || COALESCE(d.bucket, 'crm-documents') || '/' || d.file_path
        ELSE NULL
      END
    ) AS file_url,
    d.file_size::bigint,
    d.uploaded_at,
    COALESCE(d.status, 'pending')::text AS status,
    (d.status = 'validated') AS validated,
    d.validated_at,
    d.rejection_reason AS refusal_reason,
    d.notes,
    d.custom_label
  FROM crm_lead_documents d
  WHERE d.lead_id = v_lead_id
  ORDER BY d.uploaded_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_documents_by_token(text) TO anon, authenticated;