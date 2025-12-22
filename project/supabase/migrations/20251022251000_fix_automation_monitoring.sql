/*
  # Fix Automation Monitoring System

  Corrige les erreurs de la migration précédente et simplifie le système.

  ## Corrections
  - Drop et recréation propre de automation_logs
  - Simplification de la vue automation_status
  - Fix des fonctions RPC
  - Ajout de données de test
*/

-- ============================================
-- 1. NETTOYER L'EXISTANT
-- ============================================

-- Supprimer la vue et les fonctions si elles existent
DROP VIEW IF EXISTS automation_status CASCADE;
DROP FUNCTION IF EXISTS log_automation_run CASCADE;
DROP FUNCTION IF EXISTS get_automation_stats CASCADE;
DROP FUNCTION IF EXISTS toggle_automation CASCADE;

-- Supprimer et recréer la table automation_logs
DROP TABLE IF EXISTS automation_logs CASCADE;


-- ============================================
-- 2. CRÉER LA TABLE AUTOMATION_LOGS
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

-- Index pour performance
CREATE INDEX idx_automation_logs_name ON automation_logs(automation_name);
CREATE INDEX idx_automation_logs_created_at ON automation_logs(created_at DESC);
CREATE INDEX idx_automation_logs_status ON automation_logs(status);

-- RLS
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
-- 3. CRÉER LA VUE AUTOMATION_STATUS
-- ============================================

CREATE OR REPLACE VIEW automation_status AS
SELECT
  j.jobid::text as id,
  j.jobname as name,
  CASE j.jobname
    WHEN 'generate-blog-articles-daily' THEN '📝 Génération articles blog quotidienne'
    WHEN 'generate-faq-weekly' THEN '❓ Génération FAQ hebdomadaire'
    WHEN 'aggregate-news-6h' THEN '📰 Agrégation actualités (6h)'
    WHEN 'linkedin-auto-publish-daily' THEN '📱 Publication LinkedIn quotidienne'
    WHEN 'linkedin-daily-post' THEN '📱 Post LinkedIn quotidien'
    WHEN 'pinterest-auto-publish-morning' THEN '📱 Pinterest matin'
    WHEN 'pinterest-auto-publish-evening' THEN '📱 Pinterest soir'
    WHEN 'pinterest-morning-post' THEN '📱 Pin matin'
    WHEN 'pinterest-evening-post' THEN '📱 Pin soir'
    WHEN 'youtube-daily-post' THEN '📱 YouTube quotidien'
    WHEN 'seo-daily-refresh' THEN '🔍 SEO refresh quotidien'
    WHEN 'sync-google-search-console-daily' THEN '🔍 Sync Google Search Console'
    WHEN 'auto-followup-leads-daily' THEN '📧 Relances leads auto'
    WHEN 'generate-city-pages-weekly' THEN '🏙️ Génération pages villes'
    WHEN 'scan-backlinks-weekly' THEN '🔗 Scan backlinks'
    WHEN 'scrape-taxi-companies-daily' THEN '🚕 Scraping taxis'
    WHEN 'ai-content-humanizer-3h' THEN '🤖 Humanisation IA (3h)'
    WHEN 'ai-learning-daily' THEN '🤖 Apprentissage IA'
    WHEN 'trend-analyzer-daily' THEN '🤖 Analyse tendances'
    WHEN 'viral-content-4h' THEN '🤖 Contenu viral (4h)'
    WHEN 'indexnow-ping-2h' THEN '⚙️ Ping IndexNow (2h)'
    WHEN 'ai_monitor_autocorrect_hourly' THEN '🤖 IA monitoring (horaire)'
    WHEN 'ai_update_metrics_30min' THEN '🤖 IA métriques (30min)'
    WHEN 'ai_analyze_pages_6h' THEN '🤖 IA analyse pages (6h)'
    WHEN 'ai_validate_ab_tests_daily' THEN '🤖 IA validation A/B tests'
    WHEN 'ai_auto_deploy_winners_daily' THEN '🤖 IA déploiement gagnants'
    ELSE j.jobname
  END as description,
  j.active as is_enabled,
  j.schedule as frequency,
  COALESCE(
    (SELECT COUNT(*) FROM automation_logs WHERE automation_name = j.jobname),
    0
  ) as total_runs,
  COALESCE(
    (SELECT COUNT(*) FROM automation_logs WHERE automation_name = j.jobname AND status = 'success'),
    0
  ) as successful_runs,
  (
    SELECT created_at
    FROM automation_logs
    WHERE automation_name = j.jobname
    ORDER BY created_at DESC
    LIMIT 1
  ) as last_run_at,
  (
    SELECT message
    FROM automation_logs
    WHERE automation_name = j.jobname AND status = 'error'
    ORDER BY created_at DESC
    LIMIT 1
  ) as last_error
FROM cron.job j
ORDER BY j.jobname;

GRANT SELECT ON automation_status TO anon, authenticated, service_role;


-- ============================================
-- 4. FONCTION POUR LOGGER LES EXÉCUTIONS
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
  INSERT INTO automation_logs (
    automation_name,
    status,
    message,
    details,
    execution_time_ms
  ) VALUES (
    p_automation_name,
    p_status,
    p_message,
    p_details,
    p_execution_time_ms
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_automation_run TO service_role;


-- ============================================
-- 5. FONCTION STATS GLOBALES
-- ============================================

CREATE OR REPLACE FUNCTION get_automation_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_automations', COUNT(*),
    'active_automations', COUNT(*) FILTER (WHERE active = true),
    'inactive_automations', COUNT(*) FILTER (WHERE active = false),
    'total_executions', (SELECT COUNT(*) FROM automation_logs),
    'successful_executions', (SELECT COUNT(*) FROM automation_logs WHERE status = 'success'),
    'failed_executions', (SELECT COUNT(*) FROM automation_logs WHERE status = 'error'),
    'success_rate', (
      CASE
        WHEN (SELECT COUNT(*) FROM automation_logs) > 0 THEN
          ROUND(
            (SELECT COUNT(*)::numeric FROM automation_logs WHERE status = 'success') /
            (SELECT COUNT(*)::numeric FROM automation_logs) * 100,
            2
          )
        ELSE 0
      END
    ),
    'last_24h_executions', (
      SELECT COUNT(*) FROM automation_logs
      WHERE created_at > now() - interval '24 hours'
    ),
    'last_24h_errors', (
      SELECT COUNT(*) FROM automation_logs
      WHERE created_at > now() - interval '24 hours' AND status = 'error'
    )
  )
  INTO v_stats
  FROM cron.job;

  RETURN v_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION get_automation_stats TO anon, authenticated, service_role;


-- ============================================
-- 6. FONCTION TOGGLE AUTOMATION
-- ============================================

CREATE OR REPLACE FUNCTION toggle_automation(p_job_id bigint, p_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_name text;
BEGIN
  SELECT jobname INTO v_job_name FROM cron.job WHERE jobid = p_job_id;

  UPDATE cron.job
  SET active = p_enabled
  WHERE jobid = p_job_id;

  IF FOUND THEN
    PERFORM log_automation_run(
      v_job_name,
      'success',
      CASE WHEN p_enabled THEN 'Automatisation activée' ELSE 'Automatisation désactivée' END,
      jsonb_build_object('action', 'toggle', 'enabled', p_enabled),
      0
    );
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_automation TO authenticated, service_role;


-- ============================================
-- 7. INSÉRER DES LOGS DE DÉMO
-- ============================================

DO $$
DECLARE
  v_job RECORD;
  v_count integer := 0;
BEGIN
  -- Pour chaque cron job actif, créer des logs de test
  FOR v_job IN
    SELECT jobname FROM cron.job WHERE active = true ORDER BY jobname LIMIT 15
  LOOP
    -- 2-3 logs succès par automatisation
    FOR i IN 1..2 LOOP
      PERFORM log_automation_run(
        v_job.jobname,
        'success',
        'Exécution réussie',
        jsonb_build_object('test', true, 'iteration', i),
        FLOOR(RANDOM() * 8000 + 1000)::integer
      );
      v_count := v_count + 1;
    END LOOP;

    -- Parfois un log d'erreur
    IF RANDOM() > 0.6 THEN
      PERFORM log_automation_run(
        v_job.jobname,
        'error',
        'Erreur test: Timeout API',
        jsonb_build_object('error_code', 'TIMEOUT', 'retry', true),
        NULL
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ % logs de démo créés', v_count;
END $$;


-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

DO $$
DECLARE
  v_total_crons integer;
  v_active_crons integer;
  v_total_logs integer;
  v_status_count integer;
BEGIN
  SELECT COUNT(*) INTO v_total_crons FROM cron.job;
  SELECT COUNT(*) INTO v_active_crons FROM cron.job WHERE active = true;
  SELECT COUNT(*) INTO v_total_logs FROM automation_logs;
  SELECT COUNT(*) INTO v_status_count FROM automation_status;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ SYSTÈME MONITORING CORRIGÉ ET ACTIVÉ';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total cron jobs: %', v_total_crons;
  RAISE NOTICE 'Cron jobs actifs: %', v_active_crons;
  RAISE NOTICE 'Logs créés: %', v_total_logs;
  RAISE NOTICE 'Vue automation_status: % lignes', v_status_count;
  RAISE NOTICE '';
  RAISE NOTICE '📊 Test de la vue:';
  RAISE NOTICE 'SELECT * FROM automation_status LIMIT 5;';
  RAISE NOTICE '';
  RAISE NOTICE '📈 Interface Auto-Optimizer prête !';
  RAISE NOTICE '============================================';
END $$;
