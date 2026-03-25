/*
  # Fix unimported email attachments - add prospect file path

  1. Modified Functions
    - Drop and recreate `get_unimported_email_attachments` with additional
      prospect_file_path and prospect_bucket columns so the UI can open/download
      files that the prospect uploaded but weren't classified yet.
*/

DROP FUNCTION IF EXISTS public.get_unimported_email_attachments(uuid);

CREATE OR REPLACE FUNCTION public.get_unimported_email_attachments(p_lead_id uuid)
RETURNS TABLE (
  email_id uuid,
  email_subject text,
  from_email text,
  received_at timestamptz,
  attachment_filename text,
  attachment_size bigint,
  attachment_content_type text,
  prospect_file_path text,
  prospect_bucket text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH email_jsonb_attachments AS (
    SELECT 
      em.id as eid,
      em.subject as esubject,
      em.from_email as efrom,
      em.created_at as ereceived,
      (att->>'filename')::text as fname,
      (att->>'size')::bigint as fsize,
      COALESCE(att->>'contentType', 'application/octet-stream')::text as fctype
    FROM email_messages em,
    jsonb_array_elements(em.attachments) as att
    WHERE em.lead_id = p_lead_id
    AND em.attachments IS NOT NULL
    AND jsonb_array_length(em.attachments) > 0
  ),
  already_classified AS (
    SELECT LOWER(TRIM(file_name)) as normalized_name
    FROM crm_lead_documents
    WHERE lead_id = p_lead_id
  ),
  prospect_docs AS (
    SELECT LOWER(TRIM(file_name)) as normalized_name, file_path
    FROM prospect_documents
    WHERE lead_id = p_lead_id
  )
  SELECT 
    eja.eid as email_id,
    eja.esubject as email_subject,
    eja.efrom as from_email,
    eja.ereceived as received_at,
    eja.fname as attachment_filename,
    eja.fsize as attachment_size,
    eja.fctype as attachment_content_type,
    pd.file_path as prospect_file_path,
    CASE WHEN pd.file_path IS NOT NULL THEN 'prospect-documents'::text ELSE NULL END as prospect_bucket
  FROM email_jsonb_attachments eja
  LEFT JOIN prospect_docs pd ON pd.normalized_name = LOWER(TRIM(eja.fname))
  WHERE LOWER(TRIM(eja.fname)) NOT IN (SELECT normalized_name FROM already_classified)
  ORDER BY eja.ereceived DESC, eja.fname;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unimported_email_attachments(uuid) TO authenticated;
