/*
  # Cron automatique pour traiter les pièces jointes des emails
  
  1. Modifications
    - Ajoute un cron job toutes les 5 minutes pour traiter les pièces jointes
    - Extrait automatiquement les documents des emails et les lie aux leads
  
  2. Sécurité
    - Fonction exécutée avec droits système
*/

-- Ajouter le cron job pour traiter les pièces jointes automatiquement
SELECT cron.schedule(
  'auto-process-email-attachments',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url') || '/functions/v1/auto-process-email-attachments'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key'))
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
