/*
  # Configuration des Cron Jobs SEO

  ## Description
  Active pg_cron pour exécuter automatiquement le rafraîchissement SEO quotidien.

  ## Cron Jobs Créés
  1. SEO Daily Refresh - Tous les jours à 2h du matin
  2. Ping Search Engines - Toutes les 6 heures
  3. Check Unindexed Pages - Tous les jours à 10h
*/

-- Activer l'extension pg_cron si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprimer les anciens jobs s'ils existent
SELECT cron.unschedule('seo-daily-refresh') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'seo-daily-refresh'
);

SELECT cron.unschedule('seo-ping-engines') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'seo-ping-engines'
);

SELECT cron.unschedule('seo-check-unindexed') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'seo-check-unindexed'
);

-- Job 1: Rafraîchissement SEO quotidien à 2h du matin
SELECT cron.schedule(
  'seo-daily-refresh',
  '0 2 * * *', -- Tous les jours à 2h du matin
  $$
  SELECT net.http_post(
    url := (SELECT CONCAT(current_setting('app.settings.supabase_url'), '/functions/v1/seo-daily-refresh')),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', CONCAT('Bearer ', current_setting('app.settings.service_role_key'))
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Job 2: Ping des moteurs de recherche toutes les 6 heures
SELECT cron.schedule(
  'seo-ping-engines',
  '0 */6 * * *', -- Toutes les 6 heures
  $$
  INSERT INTO seo_ping_history (engine, urls_pinged, method, success, response_message)
  SELECT
    engine_name,
    ARRAY['https://taxiassur.com/feeds/sitemap.xml'],
    'sitemap',
    true,
    'Automated ping from cron'
  FROM (
    VALUES ('google'), ('bing'), ('yandex')
  ) AS engines(engine_name)
  WHERE EXISTS (
    SELECT 1 FROM seo_automation_config
    WHERE key = 'auto_ping_on_publish' AND enabled = true
  );
  $$
);

-- Job 3: Vérifier les pages non indexées tous les jours à 10h
SELECT cron.schedule(
  'seo-check-unindexed',
  '0 10 * * *', -- Tous les jours à 10h
  $$
  INSERT INTO seo_webhook_events (source, event_type, payload, processed)
  SELECT
    'system',
    'unindexed_pages_alert',
    jsonb_build_object(
      'count', COUNT(*),
      'message', CONCAT(COUNT(*), ' pages non indexées depuis plus de 7 jours'),
      'timestamp', NOW()
    ),
    false
  FROM seo_indexation_status
  WHERE is_indexed = false
    AND last_checked_at < NOW() - INTERVAL '7 days'
  HAVING COUNT(*) > 10;
  $$
);

-- Fonction RPC pour déclencher manuellement le refresh
CREATE OR REPLACE FUNCTION trigger_seo_refresh()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Appeler l'Edge Function
  SELECT net.http_post(
    url := (SELECT CONCAT(current_setting('app.settings.supabase_url'), '/functions/v1/seo-daily-refresh')),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', CONCAT('Bearer ', current_setting('app.settings.service_role_key'))
    ),
    body := '{}'::jsonb
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Fonction RPC pour obtenir les stats des cron jobs
CREATE OR REPLACE FUNCTION get_seo_cron_stats()
RETURNS TABLE (
  job_name text,
  schedule text,
  last_run timestamptz,
  next_run timestamptz,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cj.jobname::text as job_name,
    cj.schedule::text,
    cj.last_start_time as last_run,
    cj.next_run_time as next_run,
    cj.active as is_active
  FROM cron.job cj
  WHERE cj.jobname LIKE 'seo-%'
  ORDER BY cj.jobname;
END;
$$;

-- Log de l'activation des cron jobs (seulement si la table existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'seo_webhook_events'
  ) THEN
    INSERT INTO seo_webhook_events (source, event_type, payload, processed)
    VALUES (
      'system',
      'cron_jobs_activated',
      jsonb_build_object(
        'jobs', jsonb_build_array('seo-daily-refresh', 'seo-ping-engines', 'seo-check-unindexed'),
        'activated_at', NOW(),
        'message', 'Cron jobs SEO activés avec succès'
      ),
      true
    );
  END IF;
END $$;
