/*
  # Fix Document Basket to Include All Sources
  
  1. Changes
    - Modify get_document_basket to include:
      - Email attachments (unclassified)
      - Prospect documents (pending/uploaded status)
    - Unified format for both sources
  
  2. Purpose
    - Show ALL documents that need classification in the basket
    - Include both email attachments AND prospect uploads
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_document_basket(uuid);

-- Create enhanced function that includes multiple sources
CREATE OR REPLACE FUNCTION get_document_basket(p_case_id uuid)
RETURNS TABLE (
  attachment_id uuid,
  filename text,
  content_type text,
  file_size bigint,
  storage_path text,
  preview_path text,
  proposed_doc_type text,
  confidence numeric,
  status text,
  received_at timestamptz,
  subject text,
  from_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Email attachments (if any)
  SELECT
    ea.id::uuid as attachment_id,
    ea.filename,
    ea.content_type,
    ea.file_size,
    ea.storage_path,
    ea.preview_path,
    ea.proposed_doc_type,
    ea.classification_confidence as confidence,
    ea.status,
    em.received_at,
    em.subject,
    em.from_email
  FROM email_attachments ea
  JOIN email_messages em ON ea.email_message_id = em.id
  WHERE (em.case_id = p_case_id OR em.lead_id = p_case_id)
  AND ea.status = 'unclassified'

  UNION ALL

  -- Prospect documents (uploaded via prospect space)
  SELECT
    pd.id::uuid as attachment_id,
    pd.file_name as filename,
    pd.mime_type as content_type,
    pd.file_size,
    pd.file_path as storage_path,
    NULL::text as preview_path,
    CASE 
      WHEN pd.document_type != 'autre' THEN pd.document_type
      ELSE NULL
    END as proposed_doc_type,
    CASE 
      WHEN pd.document_type != 'autre' THEN 0.9
      ELSE NULL
    END as confidence,
    'unclassified' as status,
    pd.uploaded_at as received_at,
    'Document uploadé par le prospect' as subject,
    'Prospect' as from_email
  FROM prospect_documents pd
  WHERE pd.lead_id = p_case_id
  AND pd.status IN ('pending', 'uploaded')
  
  ORDER BY received_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_document_basket(uuid) TO authenticated, anon;

-- Comment
COMMENT ON FUNCTION get_document_basket IS 
'Récupère tous les documents en attente de classification : pièces jointes email + uploads prospect';
