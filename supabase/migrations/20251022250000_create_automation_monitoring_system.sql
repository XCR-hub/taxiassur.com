/*
  # Système de monitoring des automatisations

  Crée les tables et vues nécessaires pour monitorer les cron jobs
  depuis le backoffice Auto-Optimizer.

  ## Nouvelles tables
  - automation_logs : Historique des exécutions
  - automation_stats : Statistiques calculées

  ## Nouvelles vues
  - automation_status : Vue unifiée sur cron.job avec stats

  ## Fonctions
  - log_automation_run() : Logger les exécutions
  - get_automation_stats() : Récupérer les stats
*/

-- ============================================
-- 1. TABLE DES LOGS D'EXÉCUTION
-- ============================================

CREATE TABLE IF NOT EXISTS automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'running')),
  message text,
  details jsonb DEFAULT '{}'::jsonb,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_job_name ON automation_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON automation_logs(status);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour automation_logs
DROP POLICY IF EXISTS "Public can read automation_logs" ON automation_logs;
CREATE POLICY "Public can read automation_logs"
  ON automation_logs FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Service role can insert automation_logs" ON automation_logs;
CREATE POLICY "Service role can insert automation_logs"
  ON automation_logs FOR INSERT
  TO service_role
  WITH CHECK (true);


-- ============================================
-- 2. VUE AUTOMATION_STATUS (Compatible Auto-Optimizer)
-- ============================================

-- Supprime la vue si elle existe
DROP VIEW IF EXISTS automation_status CASCADE;

-- Crée la vue qui unifie cron.job avec les stats
CREATE OR REPLACE VIEW automation_status AS
SELECT
  j.jobid::text as id,
  j.jobname as name,
  COALESCE(
    CASE j.jobname
      WHEN 'generate-blog-articles-daily' THEN 'Génération articles blog quotidienne'
      WHEN 'generate-faq-weekly' THEN 'Génération FAQ hebdomadaire'
      WHEN 'aggregate-news-6h' THEN 'Agrégation actualités toutes les 6h'
      WHEN 'linkedin-auto-publish-daily' THEN 'Publication LinkedIn quotidienne'
      WHEN 'pinterest-auto-publish-morning' THEN 'Publication Pinterest matin'
      WHEN 'pinterest-auto-publish-evening' THEN 'Publication Pinterest soir'
      WHEN 'youtube-daily-post' THEN 'Publication YouTube quotidienne'
      WHEN 'seo-daily-refresh' THEN 'Rafraîchissement SEO quotidien'
      WHEN 'sync-google-search-console-daily' THEN 'Synchronisation Google Search Console'
      WHEN 'auto-followup-leads-daily' THEN 'Relances leads automatiques'
      WHEN 'generate-city-pages-weekly' THEN 'Génération pages villes hebdomadaire'
      WHEN 'scan-backlinks-weekly' THEN 'Scan backlinks hebdomadaire'
      WHEN 'scrape-taxi-companies-daily' THEN 'Scraping entreprises taxis quotidien'
      WHEN 'ai-content-humanizer-3h' THEN 'Humanisation contenu IA toutes les 3h'
      WHEN 'ai-learning-daily' THEN 'Apprentissage IA quotidien'
      WHEN 'trend-analyzer-daily' THEN 'Analyse tendances quotidienne'
      WHEN 'viral-content-4h' THEN 'Génération contenu viral toutes les 4h'
      WHEN 'indexnow-ping-2h' THEN 'Ping IndexNow toutes les 2h'
      ELSE j.jobname
    END,
    j.jobname
  ) as description,
  j.active as is_enabled,
  j.schedule as frequency,
  COALESCE(
    (SELECT COUNT(*) FROM automation_logs WHERE job_name = j.jobname),
    0
  ) as total_runs,
  COALESCE(
    (SELECT COUNT(*) FROM automation_logs WHERE job_name = j.jobname AND status = 'success'),
    0
  ) as successful_runs,
  (
    SELECT created_at
    FROM automation_logs
    WHERE job_name = j.jobname
    ORDER BY created_at DESC
    LIMIT 1
  ) as last_run_at,
  (
    SELECT message
    FROM automation_logs
    WHERE job_name = j.jobname AND status = 'error'
    ORDER BY created_at DESC
    LIMIT 1
  ) as last_error
FROM cron.job j
ORDER BY j.jobname;

-- Grant access à la vue
GRANT SELECT ON automation_status TO anon, authenticated, service_role;


-- ============================================
-- 3. FONCTION POUR LOGGER LES EXÉCUTIONS
-- ============================================

CREATE OR REPLACE FUNCTION log_automation_run(
  p_job_name text,
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
    job_name,
    status,
    message,
    details,
    execution_time_ms
  ) VALUES (
    p_job_name,
    p_status,
    p_message,
    p_details,
    p_execution_time_ms
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION log_automation_run TO service_role;


-- ============================================
-- 4. FONCTION RPC POUR RÉCUPÉRER LES STATS
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
    'total_executions', (
      SELECT COUNT(*) FROM automation_logs
    ),
    'successful_executions', (
      SELECT COUNT(*) FROM automation_logs WHERE status = 'success'
    ),
    'failed_executions', (
      SELECT COUNT(*) FROM automation_logs WHERE status = 'error'
    ),
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
      WHERE created_at > now() - interval '24 hours'
      AND status = 'error'
    )
  )
  INTO v_stats
  FROM cron.job;

  RETURN v_stats;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_automation_stats TO anon, authenticated, service_role;


-- ============================================
-- 5. INSÉRER DES LOGS DE DÉMO
-- ============================================

-- Ajouter quelques logs de test pour les automatisations existantes
DO $$
DECLARE
  v_job RECORD;
BEGIN
  FOR v_job IN
    SELECT jobname FROM cron.job WHERE active = true LIMIT 10
  LOOP
    -- Log succès récent
    PERFORM log_automation_run(
      v_job.jobname,
      'success',
      'Exécution réussie',
      jsonb_build_object('test', true),
      FLOOR(RANDOM() * 5000 + 500)::integer
    );

    -- Parfois un log d'erreur
    IF RANDOM() > 0.7 THEN
      PERFORM log_automation_run(
        v_job.jobname,
        'error',
        'Erreur test: API temporairement indisponible',
        jsonb_build_object('error_code', 'API_TIMEOUT'),
        NULL
      );
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Logs de démo créés pour les automatisations actives';
END $$;


-- ============================================
-- 6. FONCTION POUR ACTIVER/DÉSACTIVER UN CRON
-- ============================================

CREATE OR REPLACE FUNCTION toggle_automation(p_job_id bigint, p_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cron.job
  SET active = p_enabled
  WHERE jobid = p_job_id;

  -- Logger l'action
  PERFORM log_automation_run(
    (SELECT jobname FROM cron.job WHERE jobid = p_job_id),
    'success',
    CASE WHEN p_enabled THEN 'Automatisation activée' ELSE 'Automatisation désactivée' END,
    jsonb_build_object('action', 'toggle', 'enabled', p_enabled),
    0
  );

  RETURN FOUND;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION toggle_automation TO authenticated, service_role;


-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

DO $$
DECLARE
  v_total_crons integer;
  v_active_crons integer;
  v_total_logs integer;
BEGIN
  SELECT COUNT(*) INTO v_total_crons FROM cron.job;
  SELECT COUNT(*) INTO v_active_crons FROM cron.job WHERE active = true;
  SELECT COUNT(*) INTO v_total_logs FROM automation_logs;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ SYSTÈME DE MONITORING ACTIVÉ';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total cron jobs: %', v_total_crons;
  RAISE NOTICE 'Cron jobs actifs: %', v_active_crons;
  RAISE NOTICE 'Logs créés: %', v_total_logs;
  RAISE NOTICE '';
  RAISE NOTICE '📊 Interface Auto-Optimizer prête !';
  RAISE NOTICE 'URL: https://taxiassur.com/backoffice/auto-optimizer';
  RAISE NOTICE '============================================';
END $$;
