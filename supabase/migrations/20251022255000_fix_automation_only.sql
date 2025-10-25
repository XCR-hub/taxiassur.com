/*
  # Fix Auto-Optimizer Only

  Corrige uniquement l'interface Auto-Optimizer.
  Les autres interfaces (AutomationScheduler et Marketing Templates)
  sont gérées dans des migrations séparées.

  ## Corrections
  - Table automation_logs
  - Vue automation_status
  - Fonctions RPC
  - Logs de démo
*/

-- ============================================
-- NETTOYER L'EXISTANT
-- ============================================

-- Drop automation_status (TABLE ou VIEW)
DO $$
BEGIN
  EXECUTE 'DROP VIEW IF EXISTS automation_status CASCADE';
EXCEPTION
  WHEN OTHERS THEN
    BEGIN
      EXECUTE 'DROP TABLE IF EXISTS automation_status CASCADE';
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
END $$;

DROP FUNCTION IF EXISTS log_automation_run CASCADE;
DROP FUNCTION IF EXISTS get_automation_stats CASCADE;
DROP FUNCTION IF EXISTS toggle_automation CASCADE;
DROP TABLE IF EXISTS automation_logs CASCADE;


-- ============================================
-- TABLE AUTOMATION_LOGS
-- ============================================

CREATE TABLE automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'running')),
  message text,
  details jsonb DEFAULT '{}'::jsonb,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_automation_logs_name ON automation_logs(automation_name);
CREATE INDEX idx_automation_logs_created_at ON automation_logs(created_at DESC);
CREATE INDEX idx_automation_logs_status ON automation_logs(status);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read automation_logs" ON automation_logs;
CREATE POLICY "Public read automation_logs"
  ON automation_logs FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Service role write automation_logs" ON automation_logs;
CREATE POLICY "Service role write automation_logs"
  ON automation_logs FOR INSERT
  TO service_role
  WITH CHECK (true);


-- ============================================
-- VUE AUTOMATION_STATUS
-- ============================================

CREATE VIEW automation_status AS
SELECT
  j.jobid::text as id,
  j.jobname as name,
  CASE j.jobname
    WHEN 'generate-blog-articles-daily' THEN '📝 Blog quotidien'
    WHEN 'generate-faq-weekly' THEN '❓ FAQ hebdomadaire'
    WHEN 'aggregate-news-6h' THEN '📰 Actualités (6h)'
    WHEN 'linkedin-auto-publish-daily' THEN '📱 LinkedIn quotidien'
    WHEN 'linkedin-daily-post' THEN '📱 Post LinkedIn'
    WHEN 'pinterest-auto-publish-morning' THEN '📱 Pinterest matin'
    WHEN 'pinterest-auto-publish-evening' THEN '📱 Pinterest soir'
    WHEN 'pinterest-morning-post' THEN '📱 Pin matin'
    WHEN 'pinterest-evening-post' THEN '📱 Pin soir'
    WHEN 'youtube-daily-post' THEN '📱 YouTube quotidien'
    WHEN 'seo-daily-refresh' THEN '🔍 SEO refresh'
    WHEN 'sync-google-search-console-daily' THEN '🔍 Sync GSC'
    WHEN 'auto-followup-leads-daily' THEN '📧 Relances leads'
    WHEN 'generate-city-pages-weekly' THEN '🏙️ Pages villes'
    WHEN 'scan-backlinks-weekly' THEN '🔗 Scan backlinks'
    WHEN 'scrape-taxi-companies-daily' THEN '🚕 Scraping taxis'
    WHEN 'ai-content-humanizer-3h' THEN '🤖 Humanisation (3h)'
    WHEN 'ai-learning-daily' THEN '🤖 Apprentissage IA'
    WHEN 'trend-analyzer-daily' THEN '🤖 Tendances'
    WHEN 'viral-content-4h' THEN '🤖 Contenu viral (4h)'
    WHEN 'indexnow-ping-2h' THEN '⚙️ IndexNow (2h)'
    ELSE j.jobname
  END as description,
  j.active as is_enabled,
  j.schedule as frequency,
  COALESCE((SELECT COUNT(*) FROM automation_logs WHERE automation_name = j.jobname), 0) as total_runs,
  COALESCE((SELECT COUNT(*) FROM automation_logs WHERE automation_name = j.jobname AND status = 'success'), 0) as successful_runs,
  (SELECT created_at FROM automation_logs WHERE automation_name = j.jobname ORDER BY created_at DESC LIMIT 1) as last_run_at,
  (SELECT message FROM automation_logs WHERE automation_name = j.jobname AND status = 'error' ORDER BY created_at DESC LIMIT 1) as last_error
FROM cron.job j
ORDER BY j.jobname;

GRANT SELECT ON automation_status TO anon, authenticated, service_role;


-- ============================================
-- FONCTIONS RPC
-- ============================================

CREATE OR REPLACE FUNCTION log_automation_run(
  p_automation_name text,
  p_status text,
  p_message text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_execution_time_ms integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO automation_logs (automation_name, status, message, details, execution_time_ms)
  VALUES (p_automation_name, p_status, p_message, p_details, p_execution_time_ms)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_automation_run TO service_role;

CREATE OR REPLACE FUNCTION toggle_automation(p_job_id bigint, p_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_name text;
BEGIN
  SELECT jobname INTO v_job_name FROM cron.job WHERE jobid = p_job_id;
  UPDATE cron.job SET active = p_enabled WHERE jobid = p_job_id;
  IF FOUND THEN
    PERFORM log_automation_run(v_job_name, 'success',
      CASE WHEN p_enabled THEN 'Activée' ELSE 'Désactivée' END,
      jsonb_build_object('action', 'toggle', 'enabled', p_enabled), 0);
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_automation TO authenticated, service_role;


-- ============================================
-- LOGS DE DÉMO
-- ============================================

DO $$
DECLARE
  v_job RECORD;
  v_count integer := 0;
BEGIN
  FOR v_job IN SELECT jobname FROM cron.job WHERE active = true ORDER BY jobname LIMIT 15 LOOP
    FOR i IN 1..2 LOOP
      PERFORM log_automation_run(v_job.jobname, 'success', 'Exécution réussie',
        jsonb_build_object('test', true), FLOOR(RANDOM() * 5000 + 1000)::integer);
      v_count := v_count + 1;
    END LOOP;
    IF RANDOM() > 0.6 THEN
      PERFORM log_automation_run(v_job.jobname, 'error', 'Erreur test: Timeout',
        jsonb_build_object('error_code', 'TIMEOUT'), NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RAISE NOTICE '✅ % logs créés', v_count;
END $$;


-- ============================================
-- VÉRIFICATION
-- ============================================

DO $$
DECLARE
  v_crons integer;
  v_logs integer;
BEGIN
  SELECT COUNT(*) INTO v_crons FROM cron.job WHERE active = true;
  SELECT COUNT(*) INTO v_logs FROM automation_logs;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ AUTO-OPTIMIZER CORRIGÉ ET PRÊT';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Cron jobs actifs: %', v_crons;
  RAISE NOTICE 'Logs automation: %', v_logs;
  RAISE NOTICE '';
  RAISE NOTICE '📊 Test: SELECT * FROM automation_status LIMIT 5;';
  RAISE NOTICE '📊 Auto-Optimizer: PRÊT';
  RAISE NOTICE '============================================';
END $$;
