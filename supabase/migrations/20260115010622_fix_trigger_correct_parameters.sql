/*
  # Corriger les paramètres du trigger
  
  1. Envoyer "name" au lieu de "full_name"
  2. Corriger tous les paramètres pour correspondre à l'edge function
*/

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
      'name', NEW.full_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'city', NEW.city,
      'status', NEW.status,
      'immatriculation', NEW.immatriculation,
      'access_token', NEW.access_token
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
