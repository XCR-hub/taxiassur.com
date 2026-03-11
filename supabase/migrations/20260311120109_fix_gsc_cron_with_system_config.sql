/*
  # Fix GSC Cron to Use system_config

  1. Changes
    - Met à jour le cron gsc-daily-sync pour utiliser system_config
    - Utilise la bonne URL et la bonne clé
    
  2. Security
    - Utilise la clé service_role pour les crons
*/

-- Supprimer l'ancien cron
SELECT cron.unschedule('gsc-daily-sync');

-- Recréer avec la bonne configuration
SELECT cron.schedule(
  'gsc-daily-sync',
  '0 3 * * *', -- Tous les jours à 3h du matin
  $$
  SELECT
    net.http_post(
      url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-sync-performance',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
      ),
      body := jsonb_build_object('days', 7),
      timeout_milliseconds := 60000
    ) as request_id;
  $$
);
