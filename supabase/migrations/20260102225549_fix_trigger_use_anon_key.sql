/*
  # Fix: Utiliser anon key au lieu de service_role_key
  
  L'Edge Function ne nécessite pas d'authentification JWT (verify_jwt: false)
  On peut donc utiliser l'anon key directement
*/

CREATE OR REPLACE FUNCTION trigger_send_lead_email_brevo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
  request_id bigint;
BEGIN
  -- Appeler l'Edge Function de manière asynchrone
  SELECT INTO request_id extensions.http_post(
    url := supabase_url || '/functions/v1/send-lead-email-brevo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'leads',
      'record', to_jsonb(NEW)
    )
  );

  -- Log pour debug
  RAISE NOTICE 'Email Edge Function called for lead %: request_id=%', NEW.id, request_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur, on log mais on ne bloque pas l'insertion
  RAISE WARNING 'Failed to call email Edge Function: %', SQLERRM;
  RETURN NEW;
END;
$$;
