/*
  # Get unimported email attachments from email metadata

  1. New Functions
    - `get_unimported_email_attachments(p_lead_id)` - Returns email attachments from
      email_messages.attachments JSONB that have NOT been imported into crm_lead_documents yet.
      Compares filenames to find which ones are missing.

  2. Purpose
    - When IMAP sync captures email metadata but doesn't download attachment files,
      this function identifies which attachments are missing so the user can manually upload them.
*/

CREATE OR REPLACE FUNCTION public.get_unimported_email_attachments(p_lead_id uuid)
RETURNS TABLE (
  email_id uuid,
  email_subject text,
  from_email text,
  received_at timestamptz,
  attachment_filename text,
  attachment_size bigint,
  attachment_content_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH email_jsonb_attachments AS (
    SELECT 
      em.id as email_id,
      em.subject as email_subject,
      em.from_email,
      em.created_at as received_at,
      (att->>'filename')::text as filename,
      (att->>'size')::bigint as file_size,
      COALESCE(att->>'contentType', 'application/octet-stream')::text as content_type
    FROM email_messages em,
    jsonb_array_elements(em.attachments) as att
    WHERE em.lead_id = p_lead_id
    AND em.attachments IS NOT NULL
    AND jsonb_array_length(em.attachments) > 0
  ),
  already_imported AS (
    SELECT LOWER(TRIM(file_name)) as normalized_name
    FROM crm_lead_documents
    WHERE lead_id = p_lead_id
  )
  SELECT 
    eja.email_id,
    eja.email_subject,
    eja.from_email,
    eja.received_at,
    eja.filename as attachment_filename,
    eja.file_size as attachment_size,
    eja.content_type as attachment_content_type
  FROM email_jsonb_attachments eja
  WHERE LOWER(TRIM(eja.filename)) NOT IN (SELECT normalized_name FROM already_imported)
  ORDER BY eja.received_at DESC, eja.filename;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unimported_email_attachments(uuid) TO authenticated;
