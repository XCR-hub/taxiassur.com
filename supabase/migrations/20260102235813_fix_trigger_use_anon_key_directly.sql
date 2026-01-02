/*
  # Simplification du trigger d'envoi d'emails

  1. Modifications
    - Utilise directement l'ANON_KEY au lieu de chercher dans vault
    - Plus simple et plus fiable
    - Timeout de 30 secondes maintenu
  
  2. Raison
    - Le service_role_key n'est pas dans le vault
    - L'ANON_KEY suffit car l'Edge Function a verify_jwt=false
*/

-- Recréer la fonction avec ANON_KEY directement
CREATE OR REPLACE FUNCTION trigger_send_lead_email_brevo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
BEGIN
  -- Appel HTTP asynchrone avec timeout de 30 secondes
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/send-lead-email-brevo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'leads',
      'record', to_jsonb(NEW)
    ),
    timeout_milliseconds := 30000
  ) INTO request_id;

  -- Log pour debug
  RAISE NOTICE 'Email Edge Function called for lead %: request_id=%', NEW.id, request_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur, on log mais on ne bloque pas l'insertion
  RAISE WARNING 'Error calling email function for lead %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;