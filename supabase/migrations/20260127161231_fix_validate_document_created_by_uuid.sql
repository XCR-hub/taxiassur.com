/*
  # Fix validate_document - created_by is uuid
  
  1. Problem
    - created_by in crm_interactions is uuid
    - But we're passing text
  
  2. Solution
    - Remove ::text cast
*/

CREATE OR REPLACE FUNCTION validate_document(
  p_lead_id uuid,
  p_document_type text,
  p_admin_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_id uuid;
  v_crm_doc_id uuid;
BEGIN
  -- Find the document in prospect_documents
  SELECT id INTO v_doc_id
  FROM prospect_documents
  WHERE lead_id = p_lead_id 
  AND document_type = p_document_type
  LIMIT 1;
  
  -- Update prospect_documents if found
  IF v_doc_id IS NOT NULL THEN
    UPDATE prospect_documents
    SET 
      status = 'validated',
      validated_by = p_admin_id,
      validated_at = now(),
      notes = COALESCE(p_notes, notes)
    WHERE id = v_doc_id;
  END IF;
  
  -- Check if document exists in crm_lead_documents
  SELECT id INTO v_crm_doc_id
  FROM crm_lead_documents
  WHERE lead_id = p_lead_id 
  AND document_type = p_document_type
  AND status != 'rejected'
  LIMIT 1;
  
  IF v_crm_doc_id IS NOT NULL THEN
    -- Update existing document
    UPDATE crm_lead_documents
    SET 
      status = 'validated',
      validated_by = p_admin_id::text,
      validated_at = now(),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
    WHERE id = v_crm_doc_id;
  ELSIF v_doc_id IS NOT NULL THEN
    -- Copy from prospect_documents to crm_lead_documents
    INSERT INTO crm_lead_documents (
      lead_id,
      document_type,
      file_name,
      file_path,
      file_size,
      mime_type,
      status,
      validated_by,
      validated_at,
      notes,
      uploaded_at
    )
    SELECT
      lead_id,
      document_type,
      file_name,
      file_path,
      file_size::integer,
      mime_type,
      'validated',
      p_admin_id::text,
      now(),
      COALESCE(p_notes, notes),
      uploaded_at
    FROM prospect_documents
    WHERE id = v_doc_id;
  END IF;

  -- Update the JSONB checklist on crm_leads
  UPDATE crm_leads
  SET 
    document_checklist = jsonb_set(
      COALESCE(document_checklist, '{}'::jsonb),
      ARRAY[p_document_type],
      jsonb_build_object(
        'status', 'validated',
        'validated', true,
        'validated_at', now()::text,
        'validated_by', p_admin_id::text,
        'notes', p_notes
      )
    ),
    updated_at = now()
  WHERE id = p_lead_id;

  -- Create interaction (created_by is uuid, not text!)
  INSERT INTO crm_interactions (
    lead_id,
    type,
    direction,
    channel,
    subject,
    content,
    status,
    created_by
  ) VALUES (
    p_lead_id,
    'note',
    'internal',
    'system',
    'Document validé: ' || p_document_type,
    'Le document "' || p_document_type || '" a été validé avec succès' || 
    CASE WHEN p_notes IS NOT NULL THEN '. Notes: ' || p_notes ELSE '' END,
    'completed',
    p_admin_id  -- ✅ uuid, pas text
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION validate_document(uuid, text, uuid, text) IS 
'Valide un document par lead_id + document_type - FIXED: created_by uuid type';
