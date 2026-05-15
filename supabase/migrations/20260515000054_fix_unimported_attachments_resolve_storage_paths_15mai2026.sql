/*
  # Fix unimported email attachments to resolve storage paths

  1. Changes
    - Update `get_unimported_email_attachments` to search storage.objects
      when an attachment was uploaded but not linked in email_attachments table
    - Adds fallback storage path resolution based on email_message_id

  2. Notes
    - Many attachments were uploaded to email-attachments bucket correctly
      but the email_attachments table insert failed due to wrong column names
    - This fix finds those orphaned files in storage
*/

CREATE OR REPLACE FUNCTION public.get_unimported_email_attachments(p_lead_id uuid)
RETURNS TABLE(
  email_id uuid,
  email_subject text,
  from_email text,
  received_at timestamptz,
  attachment_filename text,
  attachment_size bigint,
  attachment_content_type text,
  prospect_file_path text,
  prospect_bucket text,
  email_attachment_id uuid,
  storage_path text,
  storage_bucket text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
RETURN QUERY
WITH real_attachments AS (
  SELECT
    em.id AS eid,
    em.subject AS esubject,
    em.from_email AS efrom,
    em.created_at AS ereceived,
    ea.id AS ea_id,
    public.decode_mime_filename(ea.filename) AS fname,
    ea.file_size AS fsize,
    COALESCE(ea.content_type, 'application/octet-stream') AS fctype,
    ea.storage_path AS spath
  FROM email_messages em
  JOIN email_attachments ea ON ea.email_message_id = em.id
  WHERE em.lead_id = p_lead_id
  AND ea.assigned_document_id IS NULL
  AND COALESCE(ea.status, '') <> 'rejected'
),
jsonb_attachments AS (
  SELECT
    em.id AS eid,
    em.subject AS esubject,
    em.from_email AS efrom,
    em.created_at AS ereceived,
    NULL::uuid AS ea_id,
    public.decode_mime_filename((att->>'filename')::text) AS fname,
    (att->>'size')::bigint AS fsize,
    COALESCE(att->>'contentType', 'application/octet-stream') AS fctype,
    -- Try to find the file in storage based on email_id
    (
      SELECT o.name FROM storage.objects o
      WHERE o.bucket_id = 'email-attachments'
      AND o.name LIKE '%/' || em.id::text || '/%'
      AND (
        o.name ILIKE '%' || regexp_replace((att->>'filename')::text, '[^a-zA-Z0-9._-]', '_', 'g') || '%'
        OR o.name ILIKE '%' || split_part((att->>'filename')::text, '.', 1) || '%'
      )
      ORDER BY o.created_at DESC
      LIMIT 1
    ) AS spath
  FROM email_messages em,
  jsonb_array_elements(em.attachments) AS att
  WHERE em.lead_id = p_lead_id
  AND em.attachments IS NOT NULL
  AND jsonb_array_length(em.attachments) > 0
  AND NOT EXISTS (
    SELECT 1 FROM email_attachments ea2
    WHERE ea2.email_message_id = em.id
  )
),
all_attachments AS (
  SELECT * FROM real_attachments
  UNION ALL
  SELECT * FROM jsonb_attachments
),
already_classified AS (
  SELECT LOWER(TRIM(file_name)) AS normalized_name
  FROM crm_lead_documents
  WHERE lead_id = p_lead_id
),
prospect_docs AS (
  SELECT LOWER(TRIM(file_name)) AS normalized_name, file_path
  FROM prospect_documents
  WHERE lead_id = p_lead_id
)
SELECT
  a.eid AS email_id,
  a.esubject AS email_subject,
  a.efrom AS from_email,
  a.ereceived AS received_at,
  a.fname AS attachment_filename,
  a.fsize AS attachment_size,
  a.fctype AS attachment_content_type,
  pd.file_path AS prospect_file_path,
  CASE WHEN pd.file_path IS NOT NULL THEN 'prospect-documents'::text ELSE NULL END AS prospect_bucket,
  a.ea_id AS email_attachment_id,
  a.spath AS storage_path,
  CASE WHEN a.spath IS NOT NULL THEN 'email-attachments'::text ELSE NULL END AS storage_bucket
FROM all_attachments a
LEFT JOIN prospect_docs pd ON pd.normalized_name = LOWER(TRIM(a.fname))
WHERE LOWER(TRIM(a.fname)) NOT IN (SELECT normalized_name FROM already_classified)
ORDER BY a.ereceived DESC, a.fname;
END;
$function$;
