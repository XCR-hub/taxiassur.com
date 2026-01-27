/*
  # Fix: Correction des colonnes de notification

  1. Problème
    - La fonction upload_prospect_document_by_token utilise une colonne "title" qui n'existe pas
    - La table crm_event_notifications n'a que: id, lead_id, event_type, message, priority, context_data, is_read, created_at, dismissed
  
  2. Solution
    - Corriger la fonction pour utiliser uniquement les colonnes existantes
    - Mettre toutes les infos dans message et context_data
*/

CREATE OR REPLACE FUNCTION upload_prospect_document_by_token(
  p_token text,
  p_document_type text,
  p_file_name text,
  p_file_path text,
  p_file_size bigint
)
RETURNS jsonb AS $$
DECLARE
  v_lead_id uuid;
  v_doc_id uuid;
  v_first_name text;
  v_last_name text;
  v_email text;
BEGIN
  -- Récupérer l'ID et les infos du lead correspondant au token
  SELECT l.id, l.first_name, l.last_name, l.email 
  INTO v_lead_id, v_first_name, v_last_name, v_email
  FROM crm_leads l
  WHERE l.access_token = p_token;

  -- Si pas de lead trouvé, erreur
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

  -- Mettre à jour la checklist du lead
  UPDATE crm_leads
  SET document_checklist = jsonb_set(
    COALESCE(document_checklist, '{}'::jsonb),
    ARRAY[p_document_type],
    jsonb_build_object(
      'status', 'uploaded',
      'validated', false,
      'uploaded_at', now(),
      'file_name', p_file_name
    )
  ),
  updated_at = NOW()
  WHERE id = v_lead_id;

  -- 🎯 Créer une notification pour déclencher l'email automatique
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    message,
    priority,
    context_data,
    is_read
  ) VALUES (
    v_lead_id,
    'document_uploaded',
    format('📄 Nouveau document reçu: %s - Prospect: %s %s (%s)', 
      p_document_type,
      COALESCE(v_first_name, ''), 
      COALESCE(v_last_name, ''),
      COALESCE(v_email, '')
    ),
    2, -- priority: 2 = high
    jsonb_build_object(
      'document_type', p_document_type,
      'file_name', p_file_name,
      'file_size', p_file_size,
      'document_id', v_doc_id,
      'prospect_name', format('%s %s', COALESCE(v_first_name, ''), COALESCE(v_last_name, '')),
      'prospect_email', v_email
    ),
    false -- is_read = false
  );

  RAISE LOG 'Document uploaded and notification created for lead % - Type: %', v_lead_id, p_document_type;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'lead_id', v_lead_id,
    'notification_created', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public';

COMMENT ON FUNCTION upload_prospect_document_by_token IS 'Permet à un prospect d''uploader un document via son token - envoie automatiquement un email aux admins';