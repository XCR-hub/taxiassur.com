/*
  # Notification Queue Processing Cron v2
  
  Creates a scheduled job to process pending notifications every minute
*/

-- Create cron job to process notification queue every minute
SELECT cron.schedule(
  'process-notification-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-notification-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Add to cron_jobs_config for monitoring (using correct column names)
INSERT INTO cron_jobs_config (job_name, schedule, description, enabled, function_url)
VALUES (
  'process-notification-queue',
  '* * * * *',
  'Traite la file des notifications multicanales (email, SMS, WhatsApp)',
  true,
  '/functions/v1/process-notification-queue'
)
ON CONFLICT (job_name) DO UPDATE SET
  schedule = EXCLUDED.schedule,
  description = EXCLUDED.description,
  enabled = true;
