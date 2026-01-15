/*
  # Créer CRON pour traiter la queue de notifications
  
  1. CRON Job
    - S'exécute toutes les 30 secondes
    - Appelle l'edge function process-lead-queue
    - Timeout 5s
*/

SELECT cron.schedule(
  'process-lead-queue',
  '*/30 * * * * *', -- Toutes les 30 secondes
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-lead-queue',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  ) AS request_id;
  $$
);
