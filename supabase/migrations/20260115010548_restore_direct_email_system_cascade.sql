/*
  # Restaurer le système d'envoi direct des emails (avec CASCADE)
  
  1. Supprimer tous les triggers de queue
  2. Restaurer le trigger direct qui marchait avant
*/

-- Supprimer TOUS les triggers liés
DROP TRIGGER IF EXISTS trg_fast_queue_notifications ON crm_leads;
DROP TRIGGER IF EXISTS trg_fast_notifications ON crm_leads;
DROP TRIGGER IF EXISTS trg_after_insert_lead_notification ON crm_leads;
DROP FUNCTION IF EXISTS trg_fast_queue_notifications() CASCADE;

-- Restaurer le trigger direct qui fonctionnait
CREATE OR REPLACE FUNCTION trg_send_lead_notification_direct()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT := 'https://cmvcxwbjsleeswuzpngg.supabase.co';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdmN4d2Jqc2xlZXN3dXpwbmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MDUzOTAsImV4cCI6MjA1MDk4MTM5MH0.XBbUTw_7BCr2xhT7aG4MKlsZ5oFiUTbbPLNIK6ZZWB0';
BEGIN
  -- Appeler l'edge function directement (async, ne bloque pas l'insert)
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-lead-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'lead_id', NEW.id,
      'full_name', NEW.full_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'city', NEW.city,
      'access_token', NEW.access_token,
      'assigned_to', NEW.assigned_to
    ),
    timeout_milliseconds := 2000
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ne pas bloquer l'insertion si l'appel échoue
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger AFTER INSERT
CREATE TRIGGER trg_after_insert_lead_notification
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trg_send_lead_notification_direct();
