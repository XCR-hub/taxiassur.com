/*
  # Restore validate_document Function - Frontend Compatibility
  
  1. Problem
    - Frontend calls validate_document(p_lead_id, p_document_type, p_admin_id, p_notes)
    - But current function expects validate_document(p_document_id, p_validated_by)
    - This causes "Erreur lors de la validation"
  
  2. Solution
    - Restore the validate_document overload that works with lead_id + document_type
    - Keep both versions for compatibility
*/

-- Drop old version if exists (to avoid conflicts)
DROP FUNCTION IF EXISTS validate_document(uuid, text, uuid, text);

-- Recreate the version that frontend expects
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
  v_doc_count int;
BEGIN
  -- Find the document in crm_lead_documents or prospect_documents
  SELECT id INTO v_doc_id
  FROM crm_lead_documents
  WHERE lead_id = p_lead_id 
  AND document_type = p_document_type
  LIMIT 1;
  
  -- If found in crm_lead_documents, update it
  IF v_doc_id IS NOT NULL THEN
    UPDATE crm_lead_documents
    SET 
      status = 'validated',
      validated_by = p_admin_id::text,
      validated_at = now(),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
    WHERE id = v_doc_id;
  ELSE
    -- Check in prospect_documents
    SELECT id INTO v_doc_id
    FROM prospect_documents
    WHERE lead_id = p_lead_id 
    AND document_type = p_document_type
    LIMIT 1;
    
    IF v_doc_id IS NOT NULL THEN
      UPDATE prospect_documents
      SET 
        status = 'validated',
        validated_by = p_admin_id,
        validated_at = now(),
        notes = COALESCE(p_notes, notes)
      WHERE id = v_doc_id;
      
      -- Copy to crm_lead_documents if not there yet
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
      WHERE id = v_doc_id
      ON CONFLICT (lead_id, document_type) 
      WHERE status != 'rejected'
      DO UPDATE SET
        status = 'validated',
        validated_by = p_admin_id::text,
        validated_at = now(),
        notes = COALESCE(p_notes, crm_lead_documents.notes),
        updated_at = now();
    END IF;
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
    p_admin_id::text
  );

  RETURN true;
END;
$$;

-- Also create the invalidate_document function (for reject)
DROP FUNCTION IF EXISTS invalidate_document(uuid, text, uuid, text);

CREATE OR REPLACE FUNCTION invalidate_document(
  p_lead_id uuid,
  p_document_type text,
  p_admin_id uuid,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_id uuid;
BEGIN
  -- Find in crm_lead_documents
  SELECT id INTO v_doc_id
  FROM crm_lead_documents
  WHERE lead_id = p_lead_id 
  AND document_type = p_document_type
  LIMIT 1;
  
  IF v_doc_id IS NOT NULL THEN
    UPDATE crm_lead_documents
    SET 
      status = 'rejected',
      validated_by = NULL,
      validated_at = NULL,
      rejection_reason = p_reason,
      updated_at = now()
    WHERE id = v_doc_id;
  END IF;
  
  -- Also update in prospect_documents
  UPDATE prospect_documents
  SET 
    status = 'rejected',
    validated_by = NULL,
    validated_at = NULL,
    rejection_reason = p_reason,
    notes = p_reason
  WHERE lead_id = p_lead_id 
  AND document_type = p_document_type;

  -- Update checklist
  UPDATE crm_leads
  SET 
    document_checklist = jsonb_set(
      COALESCE(document_checklist, '{}'::jsonb),
      ARRAY[p_document_type],
      jsonb_build_object(
        'status', 'rejected',
        'validated', false,
        'rejection_reason', p_reason,
        'rejected_at', now()::text,
        'rejected_by', p_admin_id::text
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
    'Document rejeté: ' || p_document_type,
    'Le document "' || p_document_type || '" a été rejeté. Raison: ' || p_reason,
    'completed',
    p_admin_id::text
  );

  -- TODO: Send notification to prospect
  
  RETURN true;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_document(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_document(uuid, text, uuid, text) TO authenticated;

COMMENT ON FUNCTION validate_document(uuid, text, uuid, text) IS 
'Valide un document par lead_id + document_type - Compatible avec frontend DocumentChecklistPanelV2';

COMMENT ON FUNCTION invalidate_document IS 
'Rejette un document et demande un remplacement - Compatible avec frontend';
