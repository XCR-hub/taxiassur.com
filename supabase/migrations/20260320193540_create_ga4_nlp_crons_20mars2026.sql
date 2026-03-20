/*
  # GA4 & NLP Crons
  - ga4-signals-sync-daily: syncs GA4 behavioral data daily at 5am
  - nlp-content-score-weekly: NLP content scoring every Sunday at 4am
*/
DO $$
DECLARE
  v_url text;
  v_key text;
  v_cmd text;
BEGIN
  SELECT value INTO v_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO v_key FROM system_config WHERE key = 'supabase_service_role_key';

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE NOTICE 'system_config keys missing - skipping cron creation';
    RETURN;
  END IF;

  -- GA4 sync daily at 5:00 AM
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ga4-signals-sync-daily') THEN
    v_cmd := 'SELECT net.http_post(' ||
             'url:=''' || v_url || '/functions/v1/sync-ga4-signals'',' ||
             'headers:=''{"Content-Type":"application/json","Authorization":"Bearer ' || v_key || '"}''::jsonb,' ||
             'body:=''{"days":30}''::jsonb)';
    PERFORM cron.schedule('ga4-signals-sync-daily', '0 5 * * *', v_cmd);
    RAISE NOTICE 'Cron ga4-signals-sync-daily créé';
  END IF;

  -- NLP scoring weekly Sunday at 4:00 AM
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nlp-content-score-weekly') THEN
    v_cmd := 'SELECT net.http_post(' ||
             'url:=''' || v_url || '/functions/v1/score-content-nlp'',' ||
             'headers:=''{"Content-Type":"application/json","Authorization":"Bearer ' || v_key || '"}''::jsonb,' ||
             'body:=''{"max_pages":50}''::jsonb)';
    PERFORM cron.schedule('nlp-content-score-weekly', '0 4 * * 0', v_cmd);
    RAISE NOTICE 'Cron nlp-content-score-weekly créé';
  END IF;
END $$;
