/*
  # Cron automatique pour créer des leads depuis les emails
  
  1. Modifications
    - Ajoute un cron job toutes les 3 minutes pour créer automatiquement des leads
    - Parse les emails entrants et crée les leads correspondants
  
  2. Sécurité
    - Fonction exécutée avec droits système
*/

-- Ajouter le cron job pour créer automatiquement les leads depuis les emails
SELECT cron.schedule(
  'auto-create-leads-from-emails',
  '*/3 * * * *', -- Toutes les 3 minutes
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url') || '/functions/v1/auto-create-leads-from-emails'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key'))
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
