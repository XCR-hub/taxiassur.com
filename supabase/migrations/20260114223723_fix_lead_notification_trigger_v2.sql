/*
  # Fix du trigger de notification - Version simplifiée
  
  ## Problème
  - Le trigger précédent dépend de paramètres qui ne sont pas toujours disponibles
  
  ## Solution
  - Utiliser net.http_post (et non extensions.http_post)
  - Utiliser l'URL Supabase directement
  - Gérer tous les cas d'erreur gracieusement
*/

CREATE OR REPLACE FUNCTION trigger_send_lead_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_request_id bigint;
  v_full_name text;
  v_payload jsonb;
BEGIN
  -- Générer access_token si pas défini
  IF NEW.access_token IS NULL OR NEW.access_token = '' THEN
    NEW.access_token := encode(sha256((NEW.id::text || COALESCE(NEW.email, '') || extract(epoch from now())::text)::bytea), 'hex');
  END IF;

  -- Construire le nom complet
  v_full_name := COALESCE(NEW.full_name, TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')));
  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := 'Prospect';
  END IF;

  -- Préparer le payload
  v_payload := jsonb_build_object(
    'lead_id', NEW.id::text,
    'name', v_full_name,
    'email', COALESCE(NEW.email, ''),
    'phone', COALESCE(NEW.phone, ''),
    'city', COALESCE(NEW.city, ''),
    'status', COALESCE(NEW.status::text, 'new'),
    'immatriculation', COALESCE(NEW.metadata->>'immatriculation', ''),
    'access_token', NEW.access_token
  );

  -- Appeler l'edge function via pg_net
  BEGIN
    -- Utiliser net.http_post de l'extension pg_net
    SELECT net.http_post(
      url := 'https://zzwqkjpafrsaanfbjigz.supabase.co/functions/v1/send-lead-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d3FranBhZnJzYWFuZmJqaWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMTU3ODksImV4cCI6MjA1MDg5MTc4OX0.j3wXfOlPfqKNsYTIpubtCCmPa15vxHVa87K6yJR-YRE'
      ),
      body := v_payload::text
    ) INTO v_request_id;
    
    RAISE NOTICE 'Email notification sent for lead % (%), request_id=%', v_full_name, NEW.email, v_request_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Logger l'erreur mais ne pas bloquer l'insertion
    RAISE WARNING 'Failed to send email for lead % (%): %', NEW.id, NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS trg_send_lead_notification ON crm_leads;

CREATE TRIGGER trg_send_lead_notification
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_lead_notification();

-- Log de confirmation
DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Trigger de notification email activé sur crm_leads';
  RAISE NOTICE 'Les emails seront envoyés automatiquement via IONOS SMTP';
  RAISE NOTICE 'Edge function: send-lead-notification';
  RAISE NOTICE '=================================================================';
END $$;
