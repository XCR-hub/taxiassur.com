/*
  # Fix document basket to include both 'pending' and 'unclassified' attachments

  1. Changes
    - Update `get_document_basket` RPC to accept both 'pending' and 'unclassified' statuses
    - Ensures email attachments synced from IMAP always appear in the document basket
  
  2. Security
    - No RLS changes
    - Function remains SECURITY DEFINER with proper search_path
*/

CREATE OR REPLACE FUNCTION get_document_basket(p_case_id uuid)
RETURNS TABLE(
  attachment_id text,
  filename text,
  content_type text,
  file_size bigint,
  storage_path text,
  preview_path text,
  proposed_doc_type text,
  confidence numeric,
  status text,
  received_at timestamptz,
  email_subject text,
  from_email text,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
RETURN QUERY
SELECT
  ea.id::text as attachment_id,
  ea.filename,
  ea.content_type,
  ea.file_size,
  ea.storage_path,
  ea.preview_path,
  ea.proposed_doc_type,
  ea.classification_confidence as confidence,
  ea.status,
  COALESCE(em.received_at, ea.created_at) as received_at,
  em.subject as email_subject,
  em.from_email,
  'email_attachments'::text as source
FROM email_attachments ea
LEFT JOIN email_messages em ON em.id = ea.email_message_id
WHERE (em.lead_id = p_case_id OR em.case_id = p_case_id)
AND ea.status IN ('pending', 'unclassified')

UNION ALL

SELECT
  pd.id::text as attachment_id,
  pd.file_name as filename,
  COALESCE(pd.mime_type, 'application/pdf') as content_type,
  pd.file_size::bigint,
  pd.file_path as storage_path,
  NULL::text as preview_path,
  pd.document_type as proposed_doc_type,
  CASE 
    WHEN pd.document_type IS NOT NULL AND pd.document_type != 'autre' THEN 0.9::numeric
    ELSE 0.3::numeric
  END as confidence,
  COALESCE(pd.status, 'pending') as status,
  pd.uploaded_at as received_at,
  'Document uploade par prospect' as email_subject,
  'Prospect' as from_email,
  'prospect_documents'::text as source
FROM prospect_documents pd
WHERE pd.lead_id = p_case_id
AND pd.validated = false
AND (pd.status IS NULL OR pd.status IN ('pending', 'uploaded'))
AND COALESCE(pd.status, '') != 'classified'

ORDER BY received_at DESC;
END;
$$;
