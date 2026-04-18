/*
  # Redirect LinkedIn cron jobs to new linkedin-auto-publisher function

  1. Purpose
    - The existing linkedin-publisher edge function has a bug in its counter
      increment block causing "supabase.rpc(...).catch is not a function" errors
    - We redirect both LinkedIn cron jobs (morning 9h, afternoon 15h, Mon-Fri) to
      the new working "linkedin-auto-publisher" edge function

  2. Changes
    - Unschedule old cron jobs: linkedin_morning_post, linkedin_afternoon_post
    - Recreate them pointing at linkedin-auto-publisher with empty body
      (function auto-selects the oldest scheduled LinkedIn post)
*/

DO $$
DECLARE
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
  project_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  cron_cmd text;
BEGIN
  PERFORM cron.unschedule('linkedin_morning_post') FROM cron.job WHERE jobname = 'linkedin_morning_post';
  PERFORM cron.unschedule('linkedin_afternoon_post') FROM cron.job WHERE jobname = 'linkedin_afternoon_post';

  cron_cmd := format(
    $cmd$
    SELECT net.http_post(
      url := '%s/functions/v1/linkedin-auto-publisher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer %s'
      ),
      body := '{}'::jsonb
    );
    $cmd$,
    project_url,
    anon_key
  );

  PERFORM cron.schedule('linkedin_morning_post',   '0 9 * * 1-5',  cron_cmd);
  PERFORM cron.schedule('linkedin_afternoon_post', '0 15 * * 1-5', cron_cmd);
END $$;
