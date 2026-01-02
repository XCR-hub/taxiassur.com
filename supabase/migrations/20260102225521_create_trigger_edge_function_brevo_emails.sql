/*
  # Trigger pour envoi d'emails via Edge Function Brevo
  
  1. Fonction
    - Appelle l'Edge Function send-lead-email-brevo
    - Utilise pg_net pour l'appel HTTP asynchrone
    - Gère les erreurs sans bloquer l'insertion
  
  2. Trigger
    - Se déclenche AFTER INSERT sur leads
    - Appel asynchrone pour ne pas ralentir l'insertion
*/

-- Extension nécessaire pour faire des requêtes HTTP
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Fonction qui appelle l'Edge Function
CREATE OR REPLACE FUNCTION trigger_send_lead_email_brevo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_role_key text;
  supabase_url text;
  request_id bigint;
BEGIN
  -- Récupérer les variables d'environnement
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Valeurs par défaut si non configurées
  IF supabase_url IS NULL THEN
    supabase_url := 'https://drohhxrkoequjphvabvq.supabase.co';
  END IF;
  
  IF service_role_key IS NULL THEN
    service_role_key := current_setting('app.settings.service_role_key', false);
  END IF;

  -- Appeler l'Edge Function de manière asynchrone
  SELECT INTO request_id extensions.http_post(
    url := supabase_url || '/functions/v1/send-lead-email-brevo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
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

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_send_lead_email_brevo ON leads;

CREATE TRIGGER trigger_send_lead_email_brevo
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_lead_email_brevo();

-- Commenter
COMMENT ON FUNCTION trigger_send_lead_email_brevo() IS 
'Appelle l''Edge Function send-lead-email-brevo pour envoyer les emails via Brevo';
