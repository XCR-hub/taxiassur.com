/*
  # Migration vers emails IONOS SMTP

  1. Changements
    - Désactivation de l'ancien trigger Brevo
    - Création d'un nouveau trigger pointant vers send-email-ionos
    - Utilisation du serveur SMTP IONOS pour l'envoi d'emails
    - Utilise la table 'leads' (pas 'crm_leads')
  
  2. Sécurité
    - Le trigger utilise l'authentification IONOS configurée
    - Pas de clés API externes nécessaires
*/

-- Désactiver les anciens triggers Brevo
DROP TRIGGER IF EXISTS on_lead_inserted_send_email ON leads;
DROP TRIGGER IF EXISTS on_lead_inserted_send_email_ionos ON leads;

-- Créer le nouveau trigger IONOS
CREATE OR REPLACE FUNCTION notify_new_lead_ionos()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  request_id bigint;
  supabase_url text := current_setting('app.settings.supabase_url', true);
  anon_key text := current_setting('app.settings.supabase_anon_key', true);
BEGIN
  -- Appel à la fonction Edge send-email-ionos
  SELECT
    net.http_post(
      url := supabase_url || '/functions/v1/send-email-ionos',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'leads',
        'record', jsonb_build_object(
          'id', NEW.id,
          'name', NEW.name,
          'phone', NEW.phone,
          'email', NEW.email,
          'city', NEW.city,
          'status', NEW.status,
          'immatriculation', NEW.immatriculation,
          'access_token', NEW.access_token,
          'created_at', NEW.created_at
        )
      ),
      timeout_milliseconds := 30000
    ) INTO request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, on log mais on ne bloque pas l'insertion
    RAISE WARNING 'Erreur envoi email IONOS pour lead %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Créer le trigger sur l'insertion de nouveaux leads
CREATE TRIGGER on_lead_inserted_send_email_ionos
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead_ionos();

-- Commentaire
COMMENT ON FUNCTION notify_new_lead_ionos() IS 'Envoie un email via IONOS SMTP lors de la création d''un nouveau lead';
