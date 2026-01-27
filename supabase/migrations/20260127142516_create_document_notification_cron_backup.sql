/*
  # Cron Job: Envoi des emails de notification de documents
  
  1. Problème
    - Les emails de notification ne sont pas toujours envoyés immédiatement
    - Besoin d'un système de backup fiable
  
  2. Solution
    - Créer un cron job qui s'exécute toutes les minutes
    - Traite les notifications document_uploaded non traitées
    - Marque les notifications comme "lues" une fois l'email envoyé
  
  3. Fonctionnement
    - Récupère les notifications document_uploaded avec is_read = false
    - Appelle l'edge function send-document-notification pour chacune
    - Marque la notification comme lue après envoi réussi
*/

-- Fonction de traitement des notifications de documents en attente
CREATE OR REPLACE FUNCTION process_pending_document_notifications()
RETURNS jsonb AS $$
DECLARE
  v_notification record;
  v_count int := 0;
  v_errors int := 0;
  v_supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
BEGIN
  -- Traiter les notifications de documents uploadés non envoyées (max 10 par run)
  FOR v_notification IN 
    SELECT 
      n.id,
      n.lead_id,
      n.event_type,
      n.message,
      n.context_data,
      n.created_at
    FROM crm_event_notifications n
    WHERE n.event_type = 'document_uploaded'
    AND n.is_read = false
    AND n.created_at > NOW() - INTERVAL '24 hours' -- Ne traiter que les dernières 24h
    ORDER BY n.created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Appeler l'edge function pour envoyer l'email
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
        ),
        timeout_milliseconds := 10000
      );

      -- Marquer comme lue après envoi
      UPDATE crm_event_notifications
      SET is_read = true
      WHERE id = v_notification.id;

      v_count := v_count + 1;
      
      RAISE LOG '✅ Document notification email sent for notification %', v_notification.id;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING '⚠️ Failed to send document notification %: % - %', v_notification.id, SQLSTATE, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_count,
    'errors', v_errors,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions';

-- Créer le cron job (toutes les minutes)
SELECT cron.schedule(
  'process-document-notifications',
  '* * * * *', -- Toutes les minutes
  $$SELECT process_pending_document_notifications();$$
);

COMMENT ON FUNCTION process_pending_document_notifications IS 'Traite les notifications de documents en attente et envoie les emails - Exécuté par cron toutes les minutes';
