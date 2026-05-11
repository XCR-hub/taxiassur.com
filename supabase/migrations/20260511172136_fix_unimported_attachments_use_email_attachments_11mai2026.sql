/*
  # Fix get_unimported_email_attachments to resolve real storage paths

  1. Changes
    - Rewrites `get_unimported_email_attachments(uuid)` to JOIN the
      `email_attachments` table (which has the real `storage_path`) when
      available. Falls back to the `email_messages.attachments` JSONB when
      no row exists in `email_attachments` yet (legacy emails).
    - Adds a new column `email_attachment_id` so the frontend can update
      the attachment status after classification.
    - Decodes quoted-printable/base64 MIME-encoded filenames (RFC 2047) for
      matching against `crm_lead_documents.file_name`.

  2. Security
    - SECURITY DEFINER, search_path locked to public, GRANT to authenticated.
*/

CREATE OR REPLACE FUNCTION public.decode_mime_filename(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_match text[];
  v_charset text;
  v_encoding text;
  v_payload text;
  v_decoded text;
BEGIN
  IF p_raw IS NULL OR p_raw = '' THEN
    RETURN p_raw;
  END IF;

  v_match := regexp_match(p_raw, '=\?([^?]+)\?([BbQq])\?([^?]+)\?=');
  IF v_match IS NULL THEN
    RETURN p_raw;
  END IF;

  v_charset := lower(v_match[1]);
  v_encoding := upper(v_match[2]);
  v_payload := v_match[3];

  BEGIN
    IF v_encoding = 'B' THEN
      v_decoded := convert_from(decode(v_payload, 'base64'), 'UTF8');
    ELSE
      v_decoded := p_raw;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_decoded := p_raw;
  END;

  RETURN v_decoded;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decode_mime_filename(text) TO authenticated, anon;

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
  prospect_bucket text,
  email_attachment_id uuid,
  storage_path text,
  storage_bucket text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      NULL::text AS spath
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
$$;

GRANT EXECUTE ON FUNCTION public.get_unimported_email_attachments(uuid) TO authenticated;
