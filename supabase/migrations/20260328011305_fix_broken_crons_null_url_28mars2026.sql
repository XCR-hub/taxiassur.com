/*
  # Fix 6 broken cron jobs with NULL URLs

  ## Problem
  6 cron jobs use `current_setting('app.settings.supabase_url', true)` which returns NULL
  because this PostgreSQL setting does not exist. This causes all HTTP calls to fail silently.

  ## Affected crons
  1. gsc-ai-execute-approved-decisions (daily 4AM)
  2. gsc-ai-generate-content-morning (daily 6AM)
  3. gsc-ai-generate-content-noon (daily 12PM)
  4. gsc-ai-generate-content-evening (daily 6PM)
  5. gsc-ai-weekly-strategy-session (Mondays 9AM)
  6. news_auto_publisher_every_2_days (every 2 days 9AM)

  ## Fix
  Replace `current_setting('app.settings.supabase_url', true)` with
  `(SELECT value FROM system_config WHERE key = 'supabase_url')` which is the working pattern
  used by all other functioning crons.

  ## Security
  No changes to RLS or table structure.
*/

-- 1. Fix gsc-ai-execute-approved-decisions
SELECT cron.unschedule('gsc-ai-execute-approved-decisions');

SELECT cron.schedule(
  'gsc-ai-execute-approved-decisions',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-ai-orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := jsonb_build_object('action', 'execute_decisions'),
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);

-- 2. Fix gsc-ai-generate-content-morning
SELECT cron.unschedule('gsc-ai-generate-content-morning');

SELECT cron.schedule(
  'gsc-ai-generate-content-morning',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-ai-orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := jsonb_build_object('action', 'generate_content'),
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

-- 3. Fix gsc-ai-generate-content-noon
SELECT cron.unschedule('gsc-ai-generate-content-noon');

SELECT cron.schedule(
  'gsc-ai-generate-content-noon',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-ai-orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := jsonb_build_object('action', 'generate_content'),
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

-- 4. Fix gsc-ai-generate-content-evening
SELECT cron.unschedule('gsc-ai-generate-content-evening');

SELECT cron.schedule(
  'gsc-ai-generate-content-evening',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-ai-orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := jsonb_build_object('action', 'generate_content'),
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

-- 5. Fix gsc-ai-weekly-strategy-session
SELECT cron.unschedule('gsc-ai-weekly-strategy-session');

SELECT cron.schedule(
  'gsc-ai-weekly-strategy-session',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-ai-orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := jsonb_build_object('action', 'create_strategy_session'),
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);

-- 6. Fix news_auto_publisher_every_2_days
SELECT cron.unschedule('news_auto_publisher_every_2_days');

SELECT cron.schedule(
  'news_auto_publisher_every_2_days',
  '0 9 */2 * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/news-auto-publisher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := jsonb_build_object('auto', true, 'timestamp', extract(epoch from now())),
    timeout_milliseconds := 60000
  );
  $$
);
