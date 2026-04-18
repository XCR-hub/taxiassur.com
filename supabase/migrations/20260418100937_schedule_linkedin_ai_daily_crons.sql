/*
  # Schedule daily LinkedIn AI content generation

  1. Purpose
    - Fully autonomous daily LinkedIn presence
    - linkedin-ai-content-generator uses OpenAI to write unique, professional
      posts about taxi insurance (taxiassur.fr) then immediately publishes them
      through linkedin-auto-publisher

  2. Changes
    - Replace the two existing LinkedIn publication crons (9h, 15h Mon-Fri)
      with two generation+publication crons at the same times
    - Each run: generate fresh unique AI content -> publish to LinkedIn ->
      update counters
    - Keeps weekdays only to maintain BtoB relevance

  3. Safety
    - Function itself checks for duplicate content against past posts
    - Logs every run (success or error) to automation_logs
*/

DO $$
DECLARE
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
  project_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  cron_cmd text;
BEGIN
  PERFORM cron.unschedule('linkedin_morning_post')   FROM cron.job WHERE jobname = 'linkedin_morning_post';
  PERFORM cron.unschedule('linkedin_afternoon_post') FROM cron.job WHERE jobname = 'linkedin_afternoon_post';
  PERFORM cron.unschedule('linkedin_ai_morning')     FROM cron.job WHERE jobname = 'linkedin_ai_morning';
  PERFORM cron.unschedule('linkedin_ai_afternoon')   FROM cron.job WHERE jobname = 'linkedin_ai_afternoon';

  cron_cmd := format(
    $cmd$
    SELECT net.http_post(
      url := '%s/functions/v1/linkedin-ai-content-generator',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer %s'
      ),
      body := '{"publish_now": true}'::jsonb,
      timeout_milliseconds := 60000
    );
    $cmd$,
    project_url,
    anon_key
  );

  PERFORM cron.schedule('linkedin_ai_morning',   '0 9 * * 1-5',  cron_cmd);
  PERFORM cron.schedule('linkedin_ai_afternoon', '0 15 * * 1-5', cron_cmd);
END $$;
