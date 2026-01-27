/*
  # Fix upload_prospect_document_by_token function - JSONB path error

  1. Changes
    - Fix jsonb_set to properly handle string keys in document_checklist
    - Use proper JSONB key notation instead of ARRAY[string]
  
  2. Security
    - Maintains SECURITY DEFINER for token-based access
*/

CREATE OR REPLACE FUNCTION upload_prospect_document_by_token(
  p_token text,
  p_document_type text,
  p_file_name text,
  p_file_path text,
  p_file_size bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $$
DECLARE
  v_lead_id uuid;
  v_doc_id uuid;
  v_first_name text;
  v_last_name text;
  v_email text;
  v_notification_id uuid;
BEGIN
  -- Récupérer l'ID et les infos du lead
  SELECT l.id, l.first_name, l.last_name, l.email 
  INTO v_lead_id, v_first_name, v_last_name, v_email
  FROM crm_leads l
  WHERE l.access_token = p_token;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide';
  END IF;

  -- Insérer le document
  INSERT INTO prospect_documents (
    lead_id,
    document_type,
    file_name,
    file_path,
    file_size,
    status
  ) VALUES (
    v_lead_id,
    p_document_type,
    p_file_name,
    p_file_path,
    p_file_size,
    'uploaded'
  ) RETURNING id INTO v_doc_id;

  -- Mettre à jour la checklist avec la bonne syntaxe JSONB
  UPDATE crm_leads
  SET document_checklist = COALESCE(document_checklist, '{}'::jsonb) || 
    jsonb_build_object(
      p_document_type,
      jsonb_build_object(
        'status', 'uploaded',
        'validated', false,
        'uploaded_at', now(),
        'file_name', p_file_name
      )
    ),
    updated_at = NOW()
  WHERE id = v_lead_id;

  -- Créer une notification (sera traitée par le cron)
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    message,
    priority,
    context_data,
    is_read,
    email_sent_at,
    email_attempts
  ) VALUES (
    v_lead_id,
    'document_uploaded',
    format('📄 Nouveau document reçu: %s - Prospect: %s %s (%s)', 
      p_document_type,
      COALESCE(v_first_name, ''), 
      COALESCE(v_last_name, ''),
      COALESCE(v_email, '')
    ),
    2,
    jsonb_build_object(
      'document_type', p_document_type,
      'file_name', p_file_name,
      'file_size', p_file_size,
      'document_id', v_doc_id,
      'prospect_name', format('%s %s', COALESCE(v_first_name, ''), COALESCE(v_last_name, '')),
      'prospect_email', v_email
    ),
    false,
    NULL,
    0
  ) RETURNING id INTO v_notification_id;

  RAISE LOG '📄 Document uploaded, notification % created for lead %', v_notification_id, v_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'lead_id', v_lead_id,
    'notification_id', v_notification_id,
    'message', 'Document uploaded successfully'
  );
END;
$$;
