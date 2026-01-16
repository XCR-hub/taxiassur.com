/*
  # Fix Document Upload Email Notifications (v2)
  
  1. New Functions
    - `trigger_send_document_notification_email()` - Sends email to admin when document uploaded
  
  2. Changes
    - Use hardcoded Supabase URL and anon key
    - Call edge function via http extension
  
  3. Security
    - Function uses http extension to call edge function
*/

-- Drop existing function
DROP FUNCTION IF EXISTS trigger_send_document_notification_email() CASCADE;

-- Create function to send email notification for document uploads
CREATE OR REPLACE FUNCTION trigger_send_document_notification_email()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
  v_response record;
BEGIN
  -- Only trigger for document_uploaded events
  IF NEW.event_type != 'document_uploaded' THEN
    RETURN NEW;
  END IF;

  -- Call edge function to send email asynchronously
  BEGIN
    -- Call using http extension
    SELECT status, content INTO v_response
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

    RAISE LOG 'Email notification sent - Status: %, Response: %', v_response.status, v_response.content;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to send email notification: % - %', SQLSTATE, SQLERRM;
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

COMMENT ON FUNCTION trigger_send_document_notification_email() IS 'Sends email notification via edge function when document is uploaded';
