/*
  # Fonction pour traiter les emails de notification de documents en attente

  Permet de traiter les notifications en attente dans crm_document_notifications
  et de les envoyer via l'Edge Function.
*/

CREATE OR REPLACE FUNCTION process_document_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification RECORD;
  v_processed_count integer := 0;
  v_error_count integer := 0;
BEGIN
  -- Traiter les notifications en attente (max 10 par exécution)
  FOR v_notification IN 
    SELECT 
      n.*,
      l.access_token,
      l.first_name,
      l.last_name
    FROM crm_document_notifications n
    INNER JOIN crm_leads l ON l.id = n.lead_id
    WHERE n.status = 'pending'
      AND n.sent_to IS NOT NULL
    ORDER BY n.created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Appeler l'Edge Function pour envoyer l'email
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-document-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'action', v_notification.notification_type,
          'lead_id', v_notification.lead_id,
          'lead_email', v_notification.sent_to,
          'lead_name', COALESCE(v_notification.first_name || ' ' || v_notification.last_name, v_notification.sent_to),
          'access_token', v_notification.access_token,
          'document_type', v_notification.metadata->>'document_type',
          'document_name', v_notification.metadata->>'file_name'
        ),
        timeout_milliseconds := 10000
      );

      -- Marquer comme envoyé
      UPDATE crm_document_notifications
      SET 
        status = 'sent',
        sent_at = NOW()
      WHERE id = v_notification.id;

      v_processed_count := v_processed_count + 1;

    EXCEPTION
      WHEN OTHERS THEN
        -- En cas d'erreur, marquer comme erreur
        UPDATE crm_document_notifications
        SET 
          status = 'error',
          error_message = SQLERRM
        WHERE id = v_notification.id;

        v_error_count := v_error_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_processed_count,
    'errors', v_error_count
  );
END;
$$;

COMMENT ON FUNCTION process_document_notifications() IS 'Traite les notifications de documents en attente et les envoie par email';
