/*
  # Fix Document Bucket Detection

  1. Problem
    - Quand on valide un document, on copie de prospect_documents vers crm_lead_documents
    - Mais on oublie de copier le bucket, donc il utilise 'crm-documents' par défaut
    - Le fichier reste dans prospect-documents mais l'URL pointe vers crm-documents

  2. Solution
    - Ajouter la colonne bucket dans l'INSERT
    - Détecter automatiquement le bucket depuis storage.objects
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
  v_file_path text;
  v_detected_bucket text;
BEGIN
  -- Find the document in prospect_documents
  SELECT id, file_path INTO v_doc_id, v_file_path
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
  
  -- Detect bucket from storage.objects
  IF v_file_path IS NOT NULL THEN
    SELECT bucket_id INTO v_detected_bucket
    FROM storage.objects
    WHERE name = v_file_path
    LIMIT 1;
    
    -- Default to prospect-documents if not found
    v_detected_bucket := COALESCE(v_detected_bucket, 'prospect-documents');
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
      bucket = v_detected_bucket,
      updated_at = now()
    WHERE id = v_crm_doc_id;
  ELSIF v_doc_id IS NOT NULL THEN
    -- Copy from prospect_documents to crm_lead_documents WITH bucket
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
      uploaded_at,
      bucket
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
      uploaded_at,
      v_detected_bucket
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

  -- Create interaction
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
    p_admin_id
  );

  RETURN true;
END;
$$;

COMMENT ON FUNCTION validate_document(uuid, text, uuid, text) IS 
'Valide un document et copie vers crm_lead_documents avec détection automatique du bucket';
