/*
  # Ajout de l'email de confirmation pour le prospect après upload
  
  1. Modifications
    - Modifie la fonction process_pending_document_notifications()
    - Ajoute l'envoi d'un email de confirmation au prospect après l'email admin
  
  2. Fonctionnement
    - Email 1 : team@taxiassur.com (notification d'upload) - EXISTANT
    - Email 2 : prospect (confirmation de réception) - NOUVEAU
  
  3. Sécurité
    - Utilise le même système de cron et edge function
*/

CREATE OR REPLACE FUNCTION process_pending_document_notifications()
RETURNS jsonb AS $$
DECLARE
  v_notification record;
  v_count int := 0;
  v_supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
  v_lead record;
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
    AND COALESCE(n.email_attempts, 0) < 5
    ORDER BY n.created_at ASC
    LIMIT 10
  LOOP
    -- Récupérer les infos du lead
    SELECT 
      id, 
      first_name, 
      last_name, 
      email, 
      phone, 
      city, 
      access_token
    INTO v_lead
    FROM crm_leads
    WHERE id = v_notification.lead_id;

    -- Marquer immédiatement comme traité
    UPDATE crm_event_notifications
    SET 
      email_attempts = COALESCE(email_attempts, 0) + 1,
      email_sent_at = NOW(),
      is_read = true
    WHERE id = v_notification.id;

    -- 📧 EMAIL 1 : Notification pour l'équipe (team@taxiassur.com)
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
          'event_type', 'upload',
          'message', v_notification.message,
          'context_data', v_notification.context_data,
          'lead_email', v_lead.email,
          'lead_name', format('%s %s', COALESCE(v_lead.first_name, ''), COALESCE(v_lead.last_name, ''))
        )
      );
      
      RAISE LOG '📧 Email admin queued for notification %', v_notification.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Failed to queue admin email for notification %: %', v_notification.id, SQLERRM;
    END;

    -- 📧 EMAIL 2 : Confirmation pour le prospect (nouveau!)
    IF v_lead.email IS NOT NULL THEN
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
            'event_type', 'confirmation',
            'lead_email', v_lead.email,
            'lead_name', format('%s %s', COALESCE(v_lead.first_name, ''), COALESCE(v_lead.last_name, '')),
            'access_token', v_lead.access_token,
            'document_type', v_notification.context_data->>'document_type',
            'context_data', v_notification.context_data
          )
        );
        
        RAISE LOG '✅ Email confirmation prospect queued for %', v_lead.email;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '⚠️ Failed to queue prospect confirmation for %: %', v_lead.email, SQLERRM;
      END;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_count,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions';

COMMENT ON FUNCTION process_pending_document_notifications IS 
'Envoie 2 emails : (1) notification admin à team@taxiassur.com, (2) confirmation prospect';
