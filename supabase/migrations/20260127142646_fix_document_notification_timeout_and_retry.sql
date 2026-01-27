/*
  # Fix: Timeout et retry pour les notifications de documents
  
  1. Problème
    - Timeout de 10 secondes trop court pour l'envoi SMTP
    - Les notifications sont marquées comme "lues" même en cas de timeout
  
  2. Solution
    - Augmenter le timeout à 30 secondes
    - Ne marquer comme "lu" QUE si status_code = 200
    - Ajouter un champ "email_sent_at" pour tracker les envois
    - Retry automatique pour les timeouts
*/

-- Ajouter une colonne pour tracker l'envoi d'email
ALTER TABLE crm_event_notifications 
ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS email_attempts int DEFAULT 0;

-- Mettre à jour la fonction de traitement
CREATE OR REPLACE FUNCTION process_pending_document_notifications()
RETURNS jsonb AS $$
DECLARE
  v_notification record;
  v_count int := 0;
  v_errors int := 0;
  v_response_id bigint;
  v_supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
BEGIN
  -- Traiter les notifications non envoyées (max 5 par run pour éviter de surcharger)
  FOR v_notification IN 
    SELECT 
      n.id,
      n.lead_id,
      n.event_type,
      n.message,
      n.context_data,
      n.created_at,
      COALESCE(n.email_attempts, 0) as email_attempts
    FROM crm_event_notifications n
    WHERE n.event_type = 'document_uploaded'
    AND n.email_sent_at IS NULL  -- Pas encore envoyé avec succès
    AND n.created_at > NOW() - INTERVAL '48 hours' -- Ne traiter que les dernières 48h
    AND COALESCE(n.email_attempts, 0) < 3  -- Max 3 tentatives
    ORDER BY n.created_at ASC
    LIMIT 5
  LOOP
    BEGIN
      -- Incrémenter le compteur de tentatives
      UPDATE crm_event_notifications
      SET email_attempts = COALESCE(email_attempts, 0) + 1
      WHERE id = v_notification.id;

      -- Appeler l'edge function avec un timeout de 30 secondes
      SELECT request_id INTO v_response_id
      FROM net.http_post(
        url := v_supabase_url || '/functions/v1/send-document-notification',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_anon_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'notification_id', v_notification.id,
          'lead_id', v_notification.lead_id,
          'event_type', v_notification.event_type,
          'message', v_notification.message,
          'context_data', v_notification.context_data
        ),
        timeout_milliseconds := 30000  -- 30 secondes
      );

      -- Attendre un peu pour que la réponse soit disponible
      PERFORM pg_sleep(2);

      -- Vérifier le résultat
      DECLARE
        v_status_code int;
        v_error_msg text;
      BEGIN
        SELECT status_code, error_msg 
        INTO v_status_code, v_error_msg
        FROM net._http_response
        WHERE id = v_response_id;

        IF v_status_code = 200 THEN
          -- Succès : marquer comme envoyé
          UPDATE crm_event_notifications
          SET 
            email_sent_at = NOW(),
            is_read = true
          WHERE id = v_notification.id;
          
          v_count := v_count + 1;
          RAISE LOG '✅ Document notification email sent successfully for notification %', v_notification.id;
        ELSE
          -- Échec : logger mais garder pour retry
          v_errors := v_errors + 1;
          RAISE WARNING '⚠️ Failed to send document notification % (attempt %): Status %, Error: %', 
            v_notification.id, v_notification.email_attempts + 1, v_status_code, v_error_msg;
        END IF;
      END;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING '⚠️ Exception sending document notification %: % - %', v_notification.id, SQLSTATE, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'sent', v_count,
    'errors', v_errors,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions';

-- Mettre à jour aussi la fonction d'upload
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

  -- Mettre à jour la checklist
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
    NULL,  -- Sera rempli par le cron après envoi réussi
    0      -- 0 tentatives au départ
  ) RETURNING id INTO v_notification_id;

  RAISE LOG '📄 Document uploaded, notification % created for lead %', v_notification_id, v_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'lead_id', v_lead_id,
    'notification_id', v_notification_id,
    'message', 'Document uploaded, email will be sent within 1 minute'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions';

COMMENT ON FUNCTION process_pending_document_notifications IS 'Traite les notifications de documents avec retry et timeout de 30s';
COMMENT ON FUNCTION upload_prospect_document_by_token IS 'Upload un document - email envoyé automatiquement par cron dans la minute';
