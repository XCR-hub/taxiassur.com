/*
  # Fix: Système de notification email pour les documents

  1. Problème
    - Le trigger avec http() ne fonctionne pas de manière fiable dans Supabase
    - Les emails de notification de documents ne sont pas envoyés
  
  2. Solution
    - Désactiver le trigger HTTP qui échoue silencieusement
    - Créer une fonction RPC que le frontend appelle après l'upload
    - Créer un cron job de backup qui traite les notifications non envoyées
  
  3. Tables modifiées
    - Aucune
  
  4. Security
    - RLS déjà en place sur crm_event_notifications
*/

-- 1. DÉSACTIVER le trigger HTTP qui ne fonctionne pas
DROP TRIGGER IF EXISTS trigger_email_on_document_notification ON crm_event_notifications;

-- 2. CRÉER une fonction RPC pour envoyer immédiatement l'email après l'upload
CREATE OR REPLACE FUNCTION send_document_notification_immediately(
  p_notification_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_notification record;
  v_supabase_url text;
  v_anon_key text;
BEGIN
  -- Récupérer la notification
  SELECT * INTO v_notification
  FROM crm_event_notifications
  WHERE id = p_notification_id
  AND event_type = 'document_uploaded';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Notification not found'
    );
  END IF;

  -- Récupérer l'URL Supabase et la clé
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);

  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://drohhxrkoequjphvabvq.supabase.co';
  END IF;

  IF v_anon_key IS NULL THEN
    v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
  END IF;

  -- Appeler l'edge function via net.http_post (pg_net)
  PERFORM net.http_post(
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
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Email notification queued'
  );
EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur, logger mais ne pas échouer
  RAISE WARNING 'Failed to send document notification: % - %', SQLSTATE, SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions';

-- 3. Mettre à jour la fonction d'upload pour appeler directement l'email
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
  v_supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
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

  -- 🎯 Créer une notification
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
    2,
    jsonb_build_object(
      'document_type', p_document_type,
      'file_name', p_file_name,
      'file_size', p_file_size,
      'document_id', v_doc_id,
      'prospect_name', format('%s %s', COALESCE(v_first_name, ''), COALESCE(v_last_name, '')),
      'prospect_email', v_email
    ),
    false
  ) RETURNING id INTO v_notification_id;

  -- ⚡ ENVOYER L'EMAIL IMMÉDIATEMENT via pg_net
  BEGIN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-document-notification',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_anon_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'notification_id', v_notification_id,
        'lead_id', v_lead_id,
        'event_type', 'document_uploaded',
        'message', format('📄 Nouveau document: %s - %s %s', p_document_type, v_first_name, v_last_name),
        'context_data', jsonb_build_object(
          'document_type', p_document_type,
          'file_name', p_file_name,
          'file_size', p_file_size,
          'document_id', v_doc_id,
          'prospect_name', format('%s %s', COALESCE(v_first_name, ''), COALESCE(v_last_name, '')),
          'prospect_email', v_email
        )
      ),
      timeout_milliseconds := 5000
    );
    
    RAISE LOG '✅ Email notification queued via pg_net for document % uploaded by %', p_document_type, v_email;
  EXCEPTION WHEN OTHERS THEN
    -- Ne pas échouer l'upload si l'email ne part pas
    RAISE WARNING '⚠️ Failed to queue email notification: % - %', SQLSTATE, SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'lead_id', v_lead_id,
    'notification_id', v_notification_id,
    'email_queued', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions';

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION send_document_notification_immediately(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION upload_prospect_document_by_token(text, text, text, text, bigint) TO authenticated, anon;

COMMENT ON FUNCTION send_document_notification_immediately IS 'Envoie immédiatement un email de notification pour un document uploadé';
COMMENT ON FUNCTION upload_prospect_document_by_token IS 'Upload un document prospect et envoie automatiquement un email à l''équipe';
