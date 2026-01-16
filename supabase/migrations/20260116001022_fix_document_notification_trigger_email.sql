/*
  # Fix Document Upload Email Notifications
  
  1. New Functions
    - `trigger_send_document_notification_email()` - Sends email to admin when document uploaded
  
  2. Changes
    - Add trigger on `crm_event_notifications` for document_uploaded events
    - Call edge function to send email via Brevo
  
  3. Security
    - Use anon key for edge function calls
*/

-- Create function to send email notification for document uploads
CREATE OR REPLACE FUNCTION trigger_send_document_notification_email()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url text;
  v_anon_key text;
  v_response text;
BEGIN
  -- Only trigger for document_uploaded events
  IF NEW.event_type != 'document_uploaded' THEN
    RETURN NEW;
  END IF;

  -- Get Supabase configuration
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Call edge function to send email
  -- Using pg_net extension (if available) or http extension
  BEGIN
    SELECT content INTO v_response
    FROM http((
      'POST',
      v_supabase_url || '/functions/v1/send-document-notification',
      ARRAY[
        http_header('Authorization', 'Bearer ' || v_anon_key),
        http_header('Content-Type', 'application/json')
      ],
      'application/json',
      jsonb_build_object(
        'notification_id', NEW.id,
        'lead_id', NEW.lead_id,
        'event_type', NEW.event_type,
        'message', NEW.message,
        'context_data', NEW.context_data
      )::text
    )::http_request);

    RAISE LOG 'Email notification sent for document upload: %', v_response;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to send email notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public';

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_email_on_document_notification ON crm_event_notifications;

-- Create trigger for document upload notifications
CREATE TRIGGER trigger_email_on_document_notification
  AFTER INSERT ON crm_event_notifications
  FOR EACH ROW
  WHEN (NEW.event_type = 'document_uploaded')
  EXECUTE FUNCTION trigger_send_document_notification_email();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION trigger_send_document_notification_email() TO postgres, service_role;

COMMENT ON FUNCTION trigger_send_document_notification_email() IS 'Sends email notification when document is uploaded by prospect';
