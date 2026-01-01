/*
  # Ajout du Cron pour Backup Automatique
  
  Configure un cron pour effectuer des backups automatiques :
  - Quotidien à 1h du matin
  - Sauvegarde toutes les tables critiques
*/

-- Backup automatique quotidien à 1h du matin
SELECT cron.schedule(
  'auto_backup_daily',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/auto-backup-system',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
