/*
  # FIX: Notifications Emails Commerciaux via IONOS SMTP

  ## Problème
  - Les commerciaux ne reçoivent pas d'emails pour les nouveaux leads
  - Le trigger appelle send-lead-email-brevo au lieu de send-lead-notification
  - send-lead-notification utilise IONOS SMTP et envoie à commercial@xcr.fr

  ## Solution
  1. Supprimer l'ancien trigger qui utilise Brevo
  2. Créer un nouveau trigger qui appelle send-lead-notification (IONOS SMTP)
  3. L'edge function envoie 3 emails:
     - team@taxiassur.com (notification interne)
     - commercial@xcr.fr (commercial)
     - prospect (confirmation)

  ## Emails Envoyés
  - ✅ team@taxiassur.com : Notification nouveau lead
  - ✅ commercial@xcr.fr : Notification commercial avec détails lead
  - ✅ Prospect : Email de confirmation avec lien espace prospect
*/

-- Supprimer l'ancien trigger Brevo
DROP TRIGGER IF EXISTS trg_send_lead_email_brevo ON crm_leads;
DROP FUNCTION IF EXISTS send_lead_email_via_brevo();

-- Créer la fonction qui appelle send-lead-notification (IONOS SMTP)
CREATE OR REPLACE FUNCTION notify_new_lead_ionos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  response text;
  supabase_url text;
  supabase_anon_key text;
BEGIN
  -- Récupérer les variables d'environnement
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Si les settings ne sont pas définis, utiliser les valeurs par défaut
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://nnmjqfvhrdoynqwykawx.supabase.co';
  END IF;

  IF supabase_anon_key IS NULL OR supabase_anon_key = '' THEN
    RAISE LOG 'SUPABASE_ANON_KEY not configured in settings';
    RETURN NEW;
  END IF;

  -- Construire le payload pour l'edge function
  payload := jsonb_build_object(
    'lead_id', NEW.id,
    'name', COALESCE(NEW.full_name, NEW.first_name || ' ' || NEW.last_name, 'Prospect'),
    'email', NEW.email,
    'phone', NEW.phone,
    'city', COALESCE(NEW.city, 'Non spécifié'),
    'status', NEW.status,
    'immatriculation', NEW.immatriculation,
    'access_token', NEW.access_token
  );

  -- Appeler l'edge function send-lead-notification via HTTP
  BEGIN
    SELECT content INTO response
    FROM http((
      'POST',
      supabase_url || '/functions/v1/send-lead-notification',
      ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer ' || supabase_anon_key)
      ],
      'application/json',
      payload::text
    )::http_request);

    RAISE LOG 'Email IONOS envoyé avec succès pour lead % (response: %)', NEW.id, response;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erreur envoi email IONOS pour lead %: %', NEW.id, SQLERRM;
  END;

  -- Créer une notification dans crm_event_notifications
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    message,
    priority,
    context_data,
    created_at
  ) VALUES (
    NEW.id,
    'new_lead',
    'Nouveau lead : ' || COALESCE(NEW.full_name, NEW.first_name || ' ' || NEW.last_name, NEW.email) || ' - ' || COALESCE(NEW.city, 'Ville non spécifiée'),
    10,
    jsonb_build_object(
      'action_url', '/backoffice/crm-killer/pipeline?lead=' || NEW.id,
      'lead_id', NEW.id,
      'email', NEW.email,
      'phone', NEW.phone
    ),
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Créer le trigger APRÈS l'insertion d'un nouveau lead
CREATE TRIGGER trg_notify_new_lead_ionos
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead_ionos();

COMMENT ON FUNCTION notify_new_lead_ionos() IS
'Envoie automatiquement des emails via IONOS SMTP (send-lead-notification) pour les nouveaux leads.
Emails envoyés: team@taxiassur.com, commercial@xcr.fr, et prospect.
Crée également une notification dans crm_event_notifications pour l''interface CRM.';

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
