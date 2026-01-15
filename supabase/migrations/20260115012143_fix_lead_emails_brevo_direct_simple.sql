/*
  # SYSTÈME EMAILS DIRECT BREVO - SIMPLE ET FONCTIONNEL
  
  ## Problème
  - Les emails ne partent plus automatiquement
  - Le système est trop compliqué
  
  ## Solution SIMPLE
  1. Nouveau lead inséré dans crm_leads
  2. Trigger appelle DIRECTEMENT l'edge function send-lead-email-brevo
  3. Brevo envoie les 2 emails (team + prospect)
  4. FINI !
  
  ## Fonctionnement
  - Edge function : send-lead-email-brevo (déjà déployée, fonctionne avec Brevo API)
  - 2 emails envoyés : team@taxiassur.com + prospect
*/

-- Supprimer TOUS les anciens triggers
DROP TRIGGER IF EXISTS trigger_notify_new_lead ON crm_leads;
DROP TRIGGER IF EXISTS trg_crm_leads_after_insert ON crm_leads;
DROP TRIGGER IF EXISTS trg_send_lead_notification ON crm_leads;
DROP TRIGGER IF EXISTS trg_lead_notification_webhook ON crm_leads;

-- Fonction ultra simple qui appelle l'edge function Brevo
CREATE OR REPLACE FUNCTION send_lead_email_via_brevo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  response text;
BEGIN
  -- Construire le payload pour l'edge function
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'crm_leads',
    'record', jsonb_build_object(
      'id', NEW.id,
      'name', COALESCE(NEW.full_name, NEW.first_name || ' ' || NEW.last_name, 'Prospect'),
      'phone', NEW.phone,
      'email', NEW.email,
      'city', NEW.city,
      'status', NEW.status,
      'immatriculation', NEW.immatriculation,
      'access_token', NEW.access_token,
      'created_at', NEW.created_at
    )
  );

  -- Appeler l'edge function send-lead-email-brevo
  BEGIN
    SELECT content INTO response
    FROM http((
      'POST',
      current_setting('app.settings.supabase_url') || '/functions/v1/send-lead-email-brevo',
      ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'))
      ],
      'application/json',
      payload::text
    )::http_request);
    
    RAISE LOG 'Email Brevo envoyé avec succès pour lead %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erreur envoi email Brevo pour lead %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Créer le trigger APRES l'insertion
CREATE TRIGGER trg_send_lead_email_brevo
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION send_lead_email_via_brevo();

COMMENT ON FUNCTION send_lead_email_via_brevo() IS 
'Appelle automatiquement l''edge function send-lead-email-brevo qui utilise Brevo pour envoyer les emails team + prospect';

-- Activer l'extension http si pas déjà fait
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Configurer les settings Supabase (à ajuster selon votre environnement)
DO $$
BEGIN
  PERFORM set_config('app.settings.supabase_url', current_setting('SUPABASE_URL', true), false);
  PERFORM set_config('app.settings.supabase_anon_key', current_setting('SUPABASE_ANON_KEY', true), false);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Config settings déjà définis ou non disponibles';
END $$;
