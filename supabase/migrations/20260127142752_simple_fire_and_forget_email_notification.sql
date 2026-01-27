/*
  # Solution simple: Fire & Forget pour les notifications email
  
  1. Problème
    - L'envoi SMTP via edge function prend trop de temps (>10s)
    - Les timeouts empêchent l'envoi des emails
  
  2. Solution
    - Utiliser net.http_post en mode asynchrone (fire & forget)
    - Ne pas attendre la réponse HTTP
    - Le cron marque simplement la tentative comme faite
    - L'edge function envoie l'email en arrière-plan
*/

-- Simplifier la fonction pour qu'elle soit rapide (fire & forget)
CREATE OR REPLACE FUNCTION process_pending_document_notifications()
RETURNS jsonb AS $$
DECLARE
  v_notification record;
  v_count int := 0;
  v_supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
BEGIN
  -- Traiter max 10 notifications en attente
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
    AND n.email_sent_at IS NULL
    AND n.created_at > NOW() - INTERVAL '48 hours'
    AND COALESCE(n.email_attempts, 0) < 5  -- Max 5 tentatives
    ORDER BY n.created_at ASC
    LIMIT 10
  LOOP
    -- Marquer immédiatement comme traité pour éviter les doublons
    UPDATE crm_event_notifications
    SET 
      email_attempts = COALESCE(email_attempts, 0) + 1,
      email_sent_at = NOW(),
      is_read = true
    WHERE id = v_notification.id;

    -- Envoyer la requête HTTP en mode "fire and forget" (pas d'attente)
    BEGIN
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
        -- Pas de timeout spécifié = fire and forget
      );
      
      v_count := v_count + 1;
      RAISE LOG '📧 Email notification queued for notification % (attempt %)', v_notification.id, v_notification.email_attempts + 1;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Failed to queue email for notification %: % - %', v_notification.id, SQLSTATE, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'queued', v_count,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions';

COMMENT ON FUNCTION process_pending_document_notifications IS 'Queue les emails de notification en mode fire-and-forget - Exécuté par cron toutes les minutes';
