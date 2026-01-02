/*
  # Augmentation du timeout du trigger d'envoi d'emails

  1. Modifications
    - Augmente le timeout de pg_net de 5000ms à 30000ms (30 secondes)
    - Permet à l'Edge Function d'avoir le temps d'envoyer les 2 emails via Brevo
    - Corrige les timeouts systématiques observés dans net._http_response
  
  2. Raison
    - L'envoi de 2 emails via l'API Brevo prend environ 6-10 secondes
    - Le timeout de 5s était trop court et causait des échecs systématiques
*/

-- Recréer la fonction avec un timeout de 30 secondes
CREATE OR REPLACE FUNCTION trigger_send_lead_email_brevo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  supabase_url text;
  service_role_key text;
BEGIN
  -- Récupérer l'URL Supabase depuis pg_settings ou utiliser la valeur par défaut
  SELECT current_setting('app.settings.supabase_url', true) INTO supabase_url;
  IF supabase_url IS NULL THEN
    supabase_url := 'https://drohhxrkoequjphvabvq.supabase.co';
  END IF;

  -- Récupérer la clé service_role depuis les secrets Supabase
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  -- Si pas de clé, utiliser une clé par défaut (à configurer dans Supabase Vault)
  IF service_role_key IS NULL THEN
    RAISE WARNING 'service_role_key not found in vault, email may not be sent';
    RETURN NEW;
  END IF;

  -- Appel HTTP asynchrone avec timeout de 30 secondes
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/send-lead-email-brevo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'leads',
      'record', to_jsonb(NEW)
    ),
    timeout_milliseconds := 30000  -- 30 secondes au lieu de 5
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

-- Le trigger existe déjà, pas besoin de le recréer
-- Il utilisera automatiquement la nouvelle version de la fonction