/*
  # Daily AI Governance Report Cron

  1. New Cron Jobs
    - `ai-governance-daily-report` - Runs every day at 8:00 AM (Paris time = 7:00 UTC)
    - Triggers the `ai-governance-daily-report` edge function
    - Sends a summary email to team@taxiassur.com with:
      - Decision statistics from the last 24 hours
      - Agent performance breakdown
      - Top leads analyzed with AI scores
      - Recent decisions list
      - Recommended actions

  2. Important Notes
    - The cron reads the Supabase URL and service role key from system_config
    - Email is sent via IONOS SMTP (configured in edge function secrets)
    - The report covers the previous 24-hour window
*/

DO $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  SELECT value INTO v_supabase_url FROM public.system_config WHERE key = 'supabase_url';
  SELECT value INTO v_service_key FROM public.system_config WHERE key = 'supabase_service_role_key';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'system_config not set for supabase_url or supabase_service_role_key, using env defaults';
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_key := current_setting('app.settings.supabase_service_role_key', true);
  END IF;

  PERFORM cron.unschedule('ai-governance-daily-report-8am')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'ai-governance-daily-report-8am'
  );

  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    PERFORM cron.schedule(
      'ai-governance-daily-report-8am',
      '0 7 * * *',
      format(
        $cron$
        SELECT net.http_post(
          url := '%s/functions/v1/ai-governance-daily-report',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer %s'
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 30000
        );
        $cron$,
        v_supabase_url,
        v_service_key
      )
    );
    RAISE NOTICE 'Cron ai-governance-daily-report-8am created (7:00 UTC = 8:00 Paris)';
  ELSE
    RAISE NOTICE 'Skipping cron creation: missing config values';
  END IF;
END $$;
