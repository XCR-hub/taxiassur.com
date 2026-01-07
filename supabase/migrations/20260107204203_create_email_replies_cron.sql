/*
  # Cron Job pour récupération automatique des réponses emails

  ## Configuration
  - Lance la fonction fetch-email-replies toutes les heures
  - Récupère les réponses via IMAP depuis IONOS
  - Enregistre automatiquement les réponses dans la base

  ## Sécurité
  - Utilise la clé service_role pour l'authentification
*/

-- Créer le cron job pour récupérer les réponses emails toutes les heures
SELECT cron.schedule(
  'fetch-email-replies-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/fetch-email-replies',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);