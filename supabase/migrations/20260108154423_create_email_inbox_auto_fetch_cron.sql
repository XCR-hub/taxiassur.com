/*
  # Automatisation récupération emails team@taxiassur.com

  1. Configuration
    - CRON job pour récupérer les emails toutes les 15 minutes
    - Appelle la fonction fetch-email-replies automatiquement

  2. Sécurité
    - Utilise le service role pour les appels Edge Functions
    - Log les erreurs dans une table dédiée
*/

-- Créer le CRON job pour récupérer les emails automatiquement
SELECT cron.schedule(
  'fetch-team-emails-auto',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/fetch-email-replies',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

COMMENT ON TABLE email_inbox IS 'Stocke les emails entrants de team@taxiassur.com récupérés via IMAP';
