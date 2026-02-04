/*
  # Fix classify_attachment - Add bucket detection

  1. Problem
    - classify_attachment insère dans crm_lead_documents sans spécifier bucket
    - Utilise 'crm-documents' par défaut alors que fichier est dans prospect-documents ou email-attachments

  2. Solution
    - Détecter le bucket depuis storage.objects
    - Inclure bucket dans l'INSERT
*/

CREATE OR REPLACE FUNCTION classify_attachment(
  p_attachment_id uuid, 
  p_doc_type text, 
  p_create_document boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_document_id uuid;
  v_storage_path text;
  v_filename text;
  v_file_size bigint;
  v_content_type text;
  v_source text;
  v_result jsonb;
  v_detected_bucket text;
BEGIN
  -- Try to find in email_attachments first
  SELECT 
    COALESCE(em.lead_id, em.case_id) as lead_id,
    ea.storage_path,
    ea.filename,
    ea.file_size,
    ea.content_type,
    'email' as source
  INTO v_lead_id, v_storage_path, v_filename, v_file_size, v_content_type, v_source
  FROM email_attachments ea
  JOIN email_messages em ON ea.email_message_id = em.id
  WHERE ea.id = p_attachment_id;

  -- If not found, try prospect_documents
  IF v_lead_id IS NULL THEN
    SELECT 
      pd.lead_id,
      pd.file_path,
      pd.file_name,
      pd.file_size,
      pd.mime_type,
      'prospect' as source
    INTO v_lead_id, v_storage_path, v_filename, v_file_size, v_content_type, v_source
    FROM prospect_documents pd
    WHERE pd.id = p_attachment_id;
  END IF;

  -- Check if we found anything
  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found');
  END IF;

  -- Detect bucket from storage.objects
  IF v_storage_path IS NOT NULL THEN
    SELECT bucket_id INTO v_detected_bucket
    FROM storage.objects
    WHERE name = v_storage_path
    LIMIT 1;
    
    -- Default based on source
    IF v_detected_bucket IS NULL THEN
      v_detected_bucket := CASE 
        WHEN v_source = 'email' THEN 'email-attachments'
        WHEN v_source = 'prospect' THEN 'prospect-documents'
        ELSE 'crm-documents'
      END;
    END IF;
  END IF;

  -- Create or update document in crm_lead_documents if requested
  IF p_create_document THEN
    -- Check if document already exists
    SELECT id INTO v_document_id
    FROM crm_lead_documents
    WHERE lead_id = v_lead_id
      AND document_type = p_doc_type
      AND status != 'rejected'
    LIMIT 1;

    -- If exists, update it
    IF v_document_id IS NOT NULL THEN
      UPDATE crm_lead_documents
      SET
        file_name = v_filename,
        file_path = v_storage_path,
        file_size = v_file_size::integer,
        mime_type = v_content_type,
        bucket = v_detected_bucket,
        status = 'pending',
        uploaded_at = now(),
        updated_at = now()
      WHERE id = v_document_id;
    ELSE
      -- Create new document WITH bucket
      INSERT INTO crm_lead_documents (
        lead_id,
        document_type,
        file_name,
        file_path,
        file_size,
        mime_type,
        bucket,
        status,
        uploaded_at
      )
      VALUES (
        v_lead_id,
        p_doc_type,
        v_filename,
        v_storage_path,
        v_file_size::integer,
        v_content_type,
        v_detected_bucket,
        'pending',
        now()
      )
      RETURNING id INTO v_document_id;
    END IF;

    -- Update source table based on origin
    IF v_source = 'email' THEN
      UPDATE email_attachments
      SET
        status = 'classified',
        proposed_doc_type = p_doc_type,
        updated_at = now()
      WHERE id = p_attachment_id;
    ELSE
      UPDATE prospect_documents
      SET
        status = 'validated',
        updated_at = now()
      WHERE id = p_attachment_id;
    END IF;
  ELSE
    -- Just update classification without creating document
    IF v_source = 'email' THEN
      UPDATE email_attachments
      SET
        status = 'classified',
        proposed_doc_type = p_doc_type,
        updated_at = now()
      WHERE id = p_attachment_id;
    ELSE
      UPDATE prospect_documents
      SET
        status = 'validated',
        updated_at = now()
      WHERE id = p_attachment_id;
    END IF;
  END IF;

  v_result = jsonb_build_object(
    'success', true,
    'document_id', v_document_id,
    'attachment_id', p_attachment_id,
    'source', v_source,
    'lead_id', v_lead_id,
    'bucket', v_detected_bucket
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION classify_attachment(uuid, text, boolean) IS 
'Classifie une pièce jointe et crée un document dans crm_lead_documents avec détection automatique du bucket';
