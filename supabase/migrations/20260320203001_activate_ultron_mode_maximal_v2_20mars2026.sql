/*
  # ULTRON - Mode Maximal Autonome TaxiAssur v2

  ## Objectifs
  1. Etre #1 Google pour assurance taxi dans sa globalite
  2. Generer des leads chaque jour automatiquement
  3. Signer un maximum de contrats via le pipeline autonome

  ## Changements
  - Active TOUS les systemes autonomes sans restriction
  - Abaisse le seuil d'auto-approbation IA a 0.60
  - Active la generation automatique de contenu
  - Augmente les limites de decisions IA a 500/jour
  - Cree les tables ultron_command_log et ultron_missions
  - Ajoute les crons ULTRON pour une cadence maximale
*/

-- ============================================================
-- 1. ACTIVATION ULTRON - CONFIGURATIONS MAXIMALES
-- ============================================================

INSERT INTO system_config (key, value) VALUES
  ('ultron_mode', 'active'),
  ('ultron_objective_1', 'google_rank_1_assurance_taxi'),
  ('ultron_objective_2', 'daily_leads_generation'),
  ('ultron_objective_3', 'maximize_contract_signing'),
  ('ai_content_auto_generate', 'true'),
  ('ai_auto_approve_threshold', '0.60'),
  ('ai_max_decisions_per_day', '500'),
  ('ai_aggressive_mode', 'true'),
  ('seo_ultra_mode', 'true'),
  ('content_generation_daily_limit', '20'),
  ('lead_followup_auto', 'true'),
  ('lead_followup_max_attempts', '10'),
  ('lead_followup_interval_hours', '24'),
  ('contract_auto_pipeline', 'true'),
  ('gsc_sync_days', '30'),
  ('gsc_opportunity_threshold', '20'),
  ('indexnow_auto_submit', 'true'),
  ('blog_posts_per_day', '5'),
  ('city_pages_per_day', '5'),
  ('backlink_emails_per_day', '20')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================
-- 2. TABLE ULTRON COMMAND LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS ultron_command_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now(),
  action_type text NOT NULL,
  subsystem text NOT NULL,
  status text DEFAULT 'success',
  impact_score integer DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ultron_command_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role ultron log"
  ON ultron_command_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated read ultron log"
  ON ultron_command_log FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ultron_log_timestamp ON ultron_command_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ultron_log_subsystem ON ultron_command_log(subsystem);

-- ============================================================
-- 3. TABLE ULTRON MISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS ultron_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_name text UNIQUE NOT NULL,
  status text DEFAULT 'active',
  progress_percent integer DEFAULT 0,
  kpi_target jsonb DEFAULT '{}'::jsonb,
  kpi_current jsonb DEFAULT '{}'::jsonb,
  last_action_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ultron_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role ultron missions"
  ON ultron_missions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated read ultron missions"
  ON ultron_missions FOR SELECT
  TO authenticated
  USING (true);

-- Inserer les 3 missions ULTRON
INSERT INTO ultron_missions (mission_name, status, kpi_target, kpi_current, progress_percent) VALUES
  (
    'MISSION_1_GOOGLE_RANK_1',
    'active',
    '{"target_position": 1, "target_queries": 100, "target_pages_indexed": 500, "target_backlinks": 200}'::jsonb,
    '{"current_position": null, "queries_tracked": 95, "pages_indexed": 0, "backlinks": 0}'::jsonb,
    5
  ),
  (
    'MISSION_2_DAILY_LEADS',
    'active',
    '{"leads_per_day": 10, "conversion_rate": 15, "monthly_leads": 300}'::jsonb,
    '{"leads_today": 0, "conversion_rate": 0, "monthly_leads": 0}'::jsonb,
    0
  ),
  (
    'MISSION_3_CONTRACTS',
    'active',
    '{"contracts_per_month": 30, "quote_to_contract_rate": 40, "avg_contract_value": 1200}'::jsonb,
    '{"contracts_month": 0, "quote_to_contract_rate": 0, "avg_contract_value": 0}'::jsonb,
    0
  )
ON CONFLICT (mission_name) DO UPDATE SET
  status = EXCLUDED.status,
  kpi_target = EXCLUDED.kpi_target,
  updated_at = now();

-- ============================================================
-- 4. FONCTION MISE A JOUR KPIs ULTRON
-- ============================================================

CREATE OR REPLACE FUNCTION ultron_update_kpis()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leads_today integer;
  v_leads_month integer;
  v_contracts_month integer;
  v_avg_position numeric;
  v_queries_count integer;
BEGIN
  SELECT COUNT(*) INTO v_leads_today
  FROM crm_leads
  WHERE DATE(created_at) = CURRENT_DATE;

  SELECT COUNT(*) INTO v_leads_month
  FROM crm_leads
  WHERE created_at >= date_trunc('month', CURRENT_DATE);

  SELECT COUNT(*) INTO v_contracts_month
  FROM crm_leads
  WHERE pipeline_stage IN ('Contrat Signé', 'contrat_signe', 'Client')
  AND updated_at >= date_trunc('month', CURRENT_DATE);

  SELECT AVG(position) INTO v_avg_position
  FROM gsc_queries
  WHERE date >= CURRENT_DATE - interval '7 days';

  SELECT COUNT(DISTINCT query) INTO v_queries_count
  FROM gsc_queries;

  UPDATE ultron_missions
  SET
    kpi_current = jsonb_build_object(
      'current_position', ROUND(v_avg_position::numeric, 1),
      'queries_tracked', v_queries_count,
      'pages_indexed', 0,
      'backlinks', 0
    ),
    progress_percent = CASE
      WHEN v_avg_position IS NULL THEN 5
      WHEN v_avg_position <= 3 THEN 95
      WHEN v_avg_position <= 5 THEN 80
      WHEN v_avg_position <= 10 THEN 60
      WHEN v_avg_position <= 20 THEN 40
      ELSE 20
    END,
    updated_at = now()
  WHERE mission_name = 'MISSION_1_GOOGLE_RANK_1';

  UPDATE ultron_missions
  SET
    kpi_current = jsonb_build_object(
      'leads_today', v_leads_today,
      'conversion_rate', 0,
      'monthly_leads', v_leads_month
    ),
    progress_percent = LEAST(100, (v_leads_month * 100 / NULLIF(300, 0))),
    updated_at = now()
  WHERE mission_name = 'MISSION_2_DAILY_LEADS';

  UPDATE ultron_missions
  SET
    kpi_current = jsonb_build_object(
      'contracts_month', v_contracts_month,
      'quote_to_contract_rate', 0,
      'avg_contract_value', 0
    ),
    progress_percent = LEAST(100, (v_contracts_month * 100 / NULLIF(30, 0))),
    updated_at = now()
  WHERE mission_name = 'MISSION_3_CONTRACTS';

END;
$$;

-- ============================================================
-- 5. CRONS ULTRON
-- ============================================================

SELECT cron.schedule(
  'ultron-kpi-update-1h',
  '45 * * * *',
  $$SELECT ultron_update_kpis();$$
);

SELECT cron.schedule(
  'ultron-gsc-sync-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-sync-performance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := '{"days": 30}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

SELECT cron.schedule(
  'ultron-lead-relance-2h',
  '30 */2 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/relance-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

SELECT cron.schedule(
  'ultron-pipeline-1h',
  '15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/pipeline-automation-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := '{"action": "all"}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

SELECT cron.schedule(
  'ultron-gsc-autonomous-3h',
  '0 */3 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-ultra-autonomous-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- Mise a jour initiale des KPIs
SELECT ultron_update_kpis();
