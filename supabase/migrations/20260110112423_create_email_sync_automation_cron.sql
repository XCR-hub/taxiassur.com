/*
  # Create Email Sync Automation Cron Job

  1. Purpose
    - Automatically sync emails from IMAP every 15 minutes
    - Automatically assign emails to leads (create if needed)
    - Keep inbox updated in real-time

  2. Schedule
    - Runs every 15 minutes
    - Calls sync-all-emails-complete edge function
    - Non-blocking execution

  3. Configuration
    - Uses ANON_KEY for authentication
    - Handles both inbound and outbound emails
    - Creates leads automatically from email contacts
*/

-- Drop existing cron if it exists
SELECT cron.unschedule('sync-emails-and-assign-leads') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-emails-and-assign-leads'
);

-- Create new cron job for complete email sync
SELECT cron.schedule(
  'sync-emails-and-assign-leads',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-all-emails-complete',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    ) as request_id;
  $$
);

-- Log the cron job creation
DO $$
BEGIN
  RAISE NOTICE 'Email sync automation cron job created successfully';
  RAISE NOTICE 'Schedule: Every 15 minutes';
  RAISE NOTICE 'Function: sync-all-emails-complete';
  RAISE NOTICE 'Actions: 1) Sync IMAP emails 2) Assign to leads 3) Create leads if needed';
END $$;
