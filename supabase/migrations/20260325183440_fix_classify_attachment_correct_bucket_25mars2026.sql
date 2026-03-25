/*
  # Fix classify_attachment to store correct bucket

  1. Changes
    - Updates `classify_attachment` function to store the correct `bucket` value
      based on the document source (email_attachments -> email-attachments,
      prospect_documents -> prospect-documents)
    - Previously the bucket column was not set, causing 404 errors when viewing

  2. Why
    - Documents classified from the basket had wrong/missing bucket references
    - This caused 404 errors because the viewer looked in the wrong bucket
*/

CREATE OR REPLACE FUNCTION classify_attachment(
  p_attachment_id text,
  p_doc_type text,
  p_create_document boolean DEFAULT true,
  p_custom_label text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attachment record;
  v_lead_id uuid;
  v_new_doc_id uuid;
  v_user_id uuid;
  v_source text;
BEGIN
  v_user_id := auth.uid();

  BEGIN
    SELECT * INTO v_attachment
    FROM email_attachments
    WHERE id::text = p_attachment_id OR id = p_attachment_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_attachment := NULL;
  END;

  IF v_attachment.id IS NOT NULL THEN
    v_source := 'email';

    SELECT COALESCE(lead_id, case_id) INTO v_lead_id
    FROM email_messages
    WHERE id = v_attachment.email_message_id;

    UPDATE email_attachments
    SET
      status = 'processed',
      proposed_doc_type = p_doc_type,
      updated_at = now()
    WHERE id = v_attachment.id;

    IF p_create_document THEN
      INSERT INTO crm_lead_documents (
        lead_id, document_type, file_name, file_path, bucket,
        file_size, mime_type, uploaded_by, status, custom_label, metadata
      )
      VALUES (
        v_lead_id, p_doc_type, v_attachment.filename,
        v_attachment.storage_path, 'email-attachments',
        v_attachment.file_size, v_attachment.content_type,
        v_user_id::text, 'pending', p_custom_label,
        jsonb_build_object('source', 'email', 'attachment_id', v_attachment.id)
      )
      RETURNING id INTO v_new_doc_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Document classe avec succes',
      'document_id', v_new_doc_id,
      'source', 'email',
      'status', 'pending'
    );
  END IF;

  BEGIN
    SELECT * INTO v_attachment
    FROM prospect_documents
    WHERE id::text = p_attachment_id OR id = p_attachment_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_attachment := NULL;
  END;

  IF v_attachment.id IS NOT NULL THEN
    v_source := 'prospect';
    v_lead_id := v_attachment.lead_id;

    UPDATE prospect_documents
    SET
      document_type = p_doc_type,
      status = 'classified',
      validated = false,
      validated_by = null,
      validated_at = null,
      updated_at = now()
    WHERE id = v_attachment.id;

    IF p_create_document THEN
      INSERT INTO crm_lead_documents (
        lead_id, document_type, file_name, file_path, bucket,
        file_size, mime_type, uploaded_by, status, custom_label, metadata
      )
      VALUES (
        v_lead_id, p_doc_type, v_attachment.file_name,
        v_attachment.file_path, 'prospect-documents',
        v_attachment.file_size, v_attachment.mime_type,
        v_user_id::text, 'pending', p_custom_label,
        jsonb_build_object('source', 'prospect', 'prospect_document_id', v_attachment.id)
      )
      RETURNING id INTO v_new_doc_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Document classe avec succes',
      'document_id', v_new_doc_id,
      'source', 'prospect',
      'status', 'pending'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Document non trouve'
  );
END;
$$;
