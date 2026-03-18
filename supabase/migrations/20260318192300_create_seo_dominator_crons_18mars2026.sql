/*
  # Système SEO Dominator — Crons IA ultra-agressifs

  ## Objectif
  Automatiser complètement l'optimisation SEO pour atteindre et maintenir
  la position #1 sur Google pour "assurance taxi" et 20 mots-clés cibles.

  ## Nouvelles tables
  - `gsc_keyword_positions` — historique quotidien des positions des 20 mots-clés cibles
  - `gsc_seo_cron_log` — journal d'exécution de tous les crons SEO

  ## Nouveau planning cron (7 crons)
  1. Toutes les 2h   — gsc-seo-dominator (traitement batch 5 tâches)
  2. Toutes les 4h   — Détection automatique nouvelles opportunités
  3. Toutes les 6h   — Moteur autonome existant (1 tâche approfondie)
  4. Toutes les 12h  — Suivi positions + soumission IndexNow globale
  5. Quotidien 3h00  — Apprentissage IA + nettoyage tâches bloquées
  6. Quotidien 6h00  — Snapshot positions mots-clés cibles
  7. Hebdo dimanche  — Audit complet + réinitialisation stratégie
*/

-- ============================================================
-- TABLE: gsc_keyword_positions
-- ============================================================
CREATE TABLE IF NOT EXISTS gsc_keyword_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  google_position numeric,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  ctr numeric DEFAULT 0,
  page_url text,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(keyword, snapshot_date)
);

ALTER TABLE gsc_keyword_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read keyword positions"
  ON gsc_keyword_positions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
  );

CREATE POLICY "Service role insert keyword positions"
  ON gsc_keyword_positions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update keyword positions"
  ON gsc_keyword_positions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_gsc_keyword_positions_keyword ON gsc_keyword_positions(keyword);
CREATE INDEX IF NOT EXISTS idx_gsc_keyword_positions_date ON gsc_keyword_positions(snapshot_date DESC);

-- ============================================================
-- TABLE: gsc_seo_cron_log
-- ============================================================
CREATE TABLE IF NOT EXISTS gsc_seo_cron_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name text NOT NULL,
  mode text DEFAULT 'auto',
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'timeout')),
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  tasks_processed integer DEFAULT 0,
  tasks_succeeded integer DEFAULT 0,
  urls_indexed integer DEFAULT 0,
  new_tasks_created integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gsc_seo_cron_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read cron log"
  ON gsc_seo_cron_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
  );

CREATE POLICY "Service role insert cron log"
  ON gsc_seo_cron_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update cron log"
  ON gsc_seo_cron_log
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_gsc_seo_cron_log_name ON gsc_seo_cron_log(cron_name);
CREATE INDEX IF NOT EXISTS idx_gsc_seo_cron_log_started ON gsc_seo_cron_log(started_at DESC);

-- ============================================================
-- FUNCTION: get_seo_dominator_stats()
-- ============================================================
CREATE OR REPLACE FUNCTION get_seo_dominator_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_top3 integer := 0;
  v_top10 integer := 0;
  v_avg_pos numeric := 0;
  v_last_run timestamptz;
  v_tasks_today integer := 0;
  v_urls_today integer := 0;
  v_pending integer := 0;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE google_position <= 3),
    COUNT(*) FILTER (WHERE google_position <= 10),
    ROUND(AVG(google_position)::numeric, 1)
  INTO v_top3, v_top10, v_avg_pos
  FROM gsc_keyword_positions
  WHERE snapshot_date = CURRENT_DATE;

  SELECT started_at INTO v_last_run
  FROM gsc_seo_cron_log
  WHERE cron_name = 'gsc-seo-dominator' AND status = 'completed'
  ORDER BY started_at DESC
  LIMIT 1;

  SELECT
    COALESCE(SUM(tasks_succeeded), 0),
    COALESCE(SUM(urls_indexed), 0)
  INTO v_tasks_today, v_urls_today
  FROM gsc_seo_cron_log
  WHERE started_at >= CURRENT_DATE AND status = 'completed';

  SELECT COUNT(*) INTO v_pending
  FROM gsc_autonomous_tasks
  WHERE status = 'pending';

  RETURN jsonb_build_object(
    'top3_keywords', v_top3,
    'top10_keywords', v_top10,
    'avg_position', COALESCE(v_avg_pos, 0),
    'last_cron_run', v_last_run,
    'tasks_succeeded_today', v_tasks_today,
    'urls_indexed_today', v_urls_today,
    'pending_tasks', v_pending
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_seo_dominator_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_seo_dominator_stats() TO service_role;

-- ============================================================
-- FUNCTION: reset_stuck_optimization_tasks()
-- ============================================================
CREATE OR REPLACE FUNCTION reset_stuck_optimization_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE gsc_autonomous_tasks
  SET status = 'pending', started_at = NULL
  WHERE status = 'processing'
    AND started_at < now() - interval '30 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_stuck_optimization_tasks() TO service_role;

-- ============================================================
-- CRONS — Suppression des anciens + nouveau planning
-- ============================================================

DO $$
BEGIN
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname IN (
    'gsc-autonomous-engine',
    'gsc-learning-engine',
    'gsc-optimizer-cron',
    'gsc-seo-dominator-2h',
    'gsc-detect-opportunities-4h',
    'gsc-autonomous-engine-6h',
    'gsc-indexnow-positions-12h',
    'gsc-learning-cleanup-3am',
    'gsc-keyword-snapshot-6am',
    'gsc-weekly-deep-audit'
  );
EXCEPTION WHEN others THEN NULL;
END $$;

-- CRON 1: SEO Dominator batch — toutes les 2 heures
SELECT cron.schedule(
  'gsc-seo-dominator-2h',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-seo-dominator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := '{"mode":"auto"}',
    timeout_milliseconds := 240000
  ) AS request_id;
  $$
);

-- CRON 2: Détection opportunités — toutes les 4 heures
SELECT cron.schedule(
  'gsc-detect-opportunities-4h',
  '30 */4 * * *',
  $$
  SELECT auto_create_optimization_tasks();
  $$
);

-- CRON 3: Moteur autonome approfondi — toutes les 6 heures
SELECT cron.schedule(
  'gsc-autonomous-engine-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-ultra-autonomous-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := '{"auto_mode":true}',
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

-- CRON 4: IndexNow + suivi positions — toutes les 12 heures
SELECT cron.schedule(
  'gsc-indexnow-positions-12h',
  '0 */12 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-seo-dominator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := '{"mode":"indexnow_only"}',
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);

-- CRON 5: Apprentissage IA + nettoyage — quotidien 3h00
SELECT cron.schedule(
  'gsc-learning-cleanup-3am',
  '0 3 * * *',
  $$
  SELECT learn_from_successful_optimizations();
  SELECT reset_stuck_optimization_tasks();
  $$
);

-- CRON 6: Snapshot positions — quotidien 6h00
SELECT cron.schedule(
  'gsc-keyword-snapshot-6am',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-seo-dominator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := '{"mode":"snapshot_only"}',
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);

-- CRON 7: Audit hebdomadaire — dimanche 2h00
SELECT cron.schedule(
  'gsc-weekly-deep-audit',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-seo-dominator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := '{"mode":"deep"}',
    timeout_milliseconds := 480000
  ) AS request_id;
  $$
);
