/*
  # Fix all remaining broken cron jobs

  1. Problem
    - 17 cron jobs still use broken URL patterns that return NULL
    - `current_setting('app.supabase_url')` does not exist in PostgreSQL
    - `current_setting('app.settings.supabase_url')` does not exist either
    - `current_setting('app.settings.service_role_key')` does not exist
    - Some crons reference a non-existent `secrets` table
    - One cron references `crm_leads_enhanced` instead of `crm_leads`

  2. Fixed Crons (17 total)
    - ai_email_notifications_morning (jobid 386)
    - ai_email_notifications_evening (jobid 387)
    - pattern_learning_engine (jobid 401)
    - auto_backup_daily (jobid 406)
    - ai_prompt_optimizer_analyze (jobid 400)
    - ai_prompt_optimizer_test (jobid 402)
    - news_digest_weekly (jobid 416)
    - relance-devis-6h (jobid 440)
    - relance-paiement-12h (jobid 441)
    - relance-signature-8h (jobid 442)
    - relance-inactifs-daily (jobid 443)
    - ai-pattern-analysis-every-6h (jobid 456)
    - unified_blog_generator (jobid 424)
    - unified_news_pipeline (jobid 426)
    - generate_ai_suggestions_cron (jobid 393)
    - daily_backlink_scan (jobid 331)
    - daily_backlink_outreach (jobid 332)

  3. Fix Applied
    - All changed to use `(SELECT value FROM system_config WHERE key = '...')`
    - Fixed table references from `crm_leads_enhanced` to `crm_leads`
    - Fixed `secrets` table references to `system_config`

  4. Important Notes
    - system_config table already contains correct supabase_url and service_role_key
    - All crons retain their original schedules and functionality
*/

-- Fix ai_email_notifications_morning (jobid 386)
SELECT cron.alter_job(
  386,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/ai-email-notification',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
);
$$
);

-- Fix ai_email_notifications_evening (jobid 387)
SELECT cron.alter_job(
  387,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/ai-email-notification',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
);
$$
);

-- Fix pattern_learning_engine (jobid 401)
SELECT cron.alter_job(
  401,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/pattern-learning-engine',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 55000
);
$$
);

-- Fix auto_backup_daily (jobid 406)
SELECT cron.alter_job(
  406,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/auto-backup-system',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 55000
);
$$
);

-- Fix ai_prompt_optimizer_analyze (jobid 400)
SELECT cron.alter_job(
  400,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/ai-prompt-optimizer',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
  ),
  body := jsonb_build_object('task', 'analyze'),
  timeout_milliseconds := 55000
);
$$
);

-- Fix ai_prompt_optimizer_test (jobid 402)
SELECT cron.alter_job(
  402,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/ai-prompt-optimizer',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
  ),
  body := jsonb_build_object('task', 'test'),
  timeout_milliseconds := 55000
);
$$
);

-- Fix news_digest_weekly (jobid 416)
SELECT cron.alter_job(
  416,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/news-digest-generator',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key'),
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object('type', 'weekly', 'send_email', true),
  timeout_milliseconds := 55000
);
$$
);

-- Fix relance-devis-6h (jobid 440)
SELECT cron.alter_job(
  440,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/relance-engine?action=quotes',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
);
$$
);

-- Fix relance-paiement-12h (jobid 441)
SELECT cron.alter_job(
  441,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/relance-engine?action=payments',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
);
$$
);

-- Fix relance-signature-8h (jobid 442)
SELECT cron.alter_job(
  442,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/relance-engine?action=signatures',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
);
$$
);

-- Fix relance-inactifs-daily (jobid 443)
SELECT cron.alter_job(
  443,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/relance-engine?action=inactive',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
);
$$
);

-- Fix ai-pattern-analysis-every-6h (jobid 456)
SELECT cron.alter_job(
  456,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/ai-pattern-analyzer',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 55000
);
$$
);

-- Fix unified_blog_generator (jobid 424) - was using non-existent 'secrets' table
SELECT cron.alter_job(
  424,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/auto-generate-blog-post',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key'),
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object('unified', true),
  timeout_milliseconds := 55000
);
$$
);

-- Fix unified_news_pipeline (jobid 426) - was using non-existent 'secrets' table
SELECT cron.alter_job(
  426,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/news-aggregator-master',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key'),
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object('full_pipeline', true),
  timeout_milliseconds := 55000
);
$$
);

-- Fix generate_ai_suggestions_cron (jobid 393) - was using crm_leads_enhanced (doesn't exist)
SELECT cron.alter_job(
  393,
  command := $$
SELECT generate_ai_suggestions(id)
FROM crm_leads
WHERE status = 'active'
AND stage NOT IN ('contrat_signe', 'perdu', 'Contrat Signé', 'Perdu')
LIMIT 50;
$$
);

-- Fix daily_backlink_scan (jobid 331) - was using current_setting('app.settings.service_role_key')
SELECT cron.alter_job(
  331,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/scan-backlinks',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key'),
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object(
    'competitors', jsonb_build_array('mfa.fr', 'april-moto.com', 'axa.fr', 'allianz.fr')
  ),
  timeout_milliseconds := 55000
);
$$
);

-- Fix daily_backlink_outreach (jobid 332) - was using current_setting('app.settings.service_role_key')
SELECT cron.alter_job(
  332,
  command := $$
SELECT net.http_post(
  url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/backlink-auto-outreach',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key'),
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object(
    'campaignId', (SELECT id FROM backlink_campaigns WHERE status = 'active' ORDER BY created_at DESC LIMIT 1),
    'maxEmailsPerRun', 10
  ),
  timeout_milliseconds := 30000
);
$$
);
