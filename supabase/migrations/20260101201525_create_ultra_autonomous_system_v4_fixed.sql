/*
  # SYSTÈME D'AUTONOMIE ULTRA-AVANCÉ V4
  
  Transforme le système en une IA 100% autonome avec :
  
  1. **Self-Healing System** - Auto-correction des erreurs
  2. **Auto-Optimization Engine** - Auto-amélioration continue
  3. **Smart Monitoring System** - Surveillance intelligente
  4. **Auto-Learning Rules** - Apprentissage automatique
  5. **Advanced Analytics** - Analyses et prédictions
*/

-- ==========================================
-- 1. SYSTÈME DE SELF-HEALING
-- ==========================================

CREATE TABLE IF NOT EXISTS system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,
  component_name text NOT NULL,
  status text NOT NULL,
  error_details jsonb DEFAULT '{}'::jsonb,
  auto_fix_attempted boolean DEFAULT false,
  auto_fix_successful boolean,
  fix_actions jsonb DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'medium',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auto_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  health_check_id uuid REFERENCES system_health_checks(id) ON DELETE CASCADE,
  problem_type text NOT NULL,
  correction_type text NOT NULL,
  original_state jsonb NOT NULL,
  corrected_state jsonb NOT NULL,
  success boolean NOT NULL,
  rollback_available boolean DEFAULT true,
  rollback_data jsonb DEFAULT '{}'::jsonb,
  performance_impact jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type text NOT NULL,
  metric_name text NOT NULL,
  expected_value numeric DEFAULT 0,
  actual_value numeric DEFAULT 0,
  deviation_percent numeric DEFAULT 0,
  severity text NOT NULL,
  auto_handled boolean DEFAULT false,
  handling_action text,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 2. AUTO-OPTIMIZATION ENGINE
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name text NOT NULL,
  prompt_version integer NOT NULL,
  prompt_text text NOT NULL,
  model_used text NOT NULL,
  parameters jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  performance_score numeric(5,2) DEFAULT 0,
  usage_count integer DEFAULT 0,
  success_rate numeric(5,2) DEFAULT 0,
  avg_response_time_ms integer DEFAULT 0,
  cost_per_use numeric(10,4) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ab_test_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name text NOT NULL,
  experiment_type text NOT NULL,
  variant_a jsonb NOT NULL,
  variant_b jsonb NOT NULL,
  variant_a_results jsonb DEFAULT '{}'::jsonb,
  variant_b_results jsonb DEFAULT '{}'::jsonb,
  winner text,
  confidence_level numeric(5,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  auto_switch_to_winner boolean DEFAULT true,
  switched_at timestamptz
);

CREATE TABLE IF NOT EXISTS model_performance_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  task_type text NOT NULL,
  success_rate numeric(5,2) NOT NULL DEFAULT 0,
  avg_latency_ms integer NOT NULL DEFAULT 0,
  cost_per_request numeric(10,6) NOT NULL DEFAULT 0,
  quality_score numeric(5,2) NOT NULL DEFAULT 0,
  total_requests integer DEFAULT 0,
  last_used_at timestamptz,
  is_recommended boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- 3. SMART MONITORING
-- ==========================================

CREATE TABLE IF NOT EXISTS realtime_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_category text NOT NULL,
  metric_name text NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  target_value numeric DEFAULT 0,
  threshold_min numeric DEFAULT 0,
  threshold_max numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'healthy',
  trend text,
  last_anomaly_at timestamptz,
  alert_sent boolean DEFAULT false,
  measurement_time timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smart_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  affected_components text[] DEFAULT ARRAY[]::text[],
  auto_resolved boolean DEFAULT false,
  resolution_action text,
  sent_to text[] DEFAULT ARRAY[]::text[],
  acknowledged boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS predictive_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_type text NOT NULL,
  target_metric text NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  predicted_value numeric NOT NULL DEFAULT 0,
  prediction_timeframe text NOT NULL,
  confidence numeric(5,2) NOT NULL DEFAULT 0,
  model_used text NOT NULL,
  factors jsonb NOT NULL,
  recommended_actions text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 4. AUTO-LEARNING RULES
-- ==========================================

CREATE TABLE IF NOT EXISTS discovered_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type text NOT NULL,
  pattern_description text NOT NULL,
  occurrences integer NOT NULL DEFAULT 1,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  data_sample jsonb NOT NULL,
  suggested_rule jsonb DEFAULT '{}'::jsonb,
  rule_created boolean DEFAULT false,
  created_rule_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rule_performance_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL,
  rule_type text NOT NULL,
  executions integer DEFAULT 0,
  successes integer DEFAULT 0,
  failures integer DEFAULT 0,
  avg_execution_time_ms integer DEFAULT 0,
  total_value_generated numeric(10,2) DEFAULT 0,
  roi_score numeric(5,2) DEFAULT 0,
  efficiency_score numeric(5,2) DEFAULT 0,
  should_keep boolean DEFAULT true,
  should_optimize boolean DEFAULT false,
  optimization_suggestions text[] DEFAULT ARRAY[]::text[],
  last_executed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS autonomous_improvements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  improvement_type text NOT NULL,
  area_affected text NOT NULL,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  expected_impact jsonb NOT NULL,
  actual_impact jsonb DEFAULT '{}'::jsonb,
  auto_applied boolean NOT NULL DEFAULT false,
  requires_approval boolean DEFAULT false,
  approved_by uuid,
  applied_at timestamptz,
  rollback_available boolean DEFAULT true,
  performance_delta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 5. ADVANCED ANALYTICS
-- ==========================================

CREATE TABLE IF NOT EXISTS automation_roi_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_name text NOT NULL,
  automation_type text NOT NULL,
  cost_per_execution numeric(10,4) DEFAULT 0,
  total_executions integer DEFAULT 0,
  successful_executions integer DEFAULT 0,
  value_generated numeric(10,2) DEFAULT 0,
  time_saved_hours numeric(8,2) DEFAULT 0,
  roi_percent numeric(8,2) DEFAULT 0,
  efficiency_score numeric(5,2) DEFAULT 0,
  recommendation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversion_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid,
  current_stage text NOT NULL,
  predicted_next_stage text NOT NULL,
  conversion_probability numeric(5,2) NOT NULL DEFAULT 0,
  expected_conversion_date timestamptz,
  confidence_level numeric(5,2) NOT NULL DEFAULT 0,
  key_factors jsonb NOT NULL,
  recommended_actions text[] DEFAULT ARRAY[]::text[],
  prediction_accurate boolean,
  actual_outcome text,
  model_version text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL UNIQUE,
  baseline_value numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  improvement_percent numeric(6,2) NOT NULL DEFAULT 0,
  all_time_best numeric DEFAULT 0,
  last_month_avg numeric DEFAULT 0,
  trend_direction text NOT NULL,
  is_healthy boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- INDEXES POUR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_health_checks_status ON system_health_checks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_component ON system_health_checks(component_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON system_anomalies(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_active ON ai_prompt_versions(prompt_name, is_active);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_test_experiments(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_performance ON model_performance_tracking(task_type, is_recommended);
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_category ON realtime_metrics(metric_category, status);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_severity ON smart_alerts(severity, acknowledged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON discovered_patterns(confidence_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rule_performance ON rule_performance_tracking(efficiency_score DESC);
CREATE INDEX IF NOT EXISTS idx_automation_roi ON automation_roi_tracking(roi_percent DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_predictions ON conversion_predictions(conversion_probability DESC, created_at DESC);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_performance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_roi_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_baselines ENABLE ROW LEVEL SECURITY;

-- Policies pour accès complet backoffice
CREATE POLICY "Full backoffice access system_health_checks"
  ON system_health_checks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access auto_corrections"
  ON auto_corrections FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access system_anomalies"
  ON system_anomalies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access ai_prompt_versions"
  ON ai_prompt_versions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access ab_test_experiments"
  ON ab_test_experiments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access model_performance_tracking"
  ON model_performance_tracking FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access realtime_metrics"
  ON realtime_metrics FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access smart_alerts"
  ON smart_alerts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access predictive_analytics"
  ON predictive_analytics FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access discovered_patterns"
  ON discovered_patterns FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access rule_performance_tracking"
  ON rule_performance_tracking FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access autonomous_improvements"
  ON autonomous_improvements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access automation_roi_tracking"
  ON automation_roi_tracking FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access conversion_predictions"
  ON conversion_predictions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Full backoffice access performance_baselines"
  ON performance_baselines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- FONCTIONS UTILITAIRES
-- ==========================================

-- Fonction pour calculer le ROI d'une automatisation
CREATE OR REPLACE FUNCTION calculate_automation_roi(automation_name_param text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_cost numeric;
  total_value numeric;
  roi numeric;
BEGIN
  SELECT 
    COALESCE(SUM(cost_per_execution * total_executions), 0),
    COALESCE(SUM(value_generated), 0)
  INTO total_cost, total_value
  FROM automation_roi_tracking
  WHERE automation_name = automation_name_param;
  
  IF total_cost > 0 THEN
    roi := ((total_value - total_cost) / total_cost) * 100;
  ELSE
    roi := 0;
  END IF;
  
  RETURN roi;
END;
$$;

-- Fonction pour détecter les anomalies
CREATE OR REPLACE FUNCTION detect_metric_anomalies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  anomaly_count integer;
BEGIN
  SELECT COUNT(*)
  INTO anomaly_count
  FROM realtime_metrics
  WHERE status != 'healthy'
  AND measurement_time > NOW() - INTERVAL '1 hour';
  
  SELECT jsonb_build_object(
    'total_anomalies', anomaly_count,
    'critical_count', (
      SELECT COUNT(*) FROM smart_alerts 
      WHERE severity = 'critical' 
      AND NOT acknowledged 
      AND created_at > NOW() - INTERVAL '1 hour'
    ),
    'auto_resolved_count', (
      SELECT COUNT(*) FROM smart_alerts 
      WHERE auto_resolved = true 
      AND created_at > NOW() - INTERVAL '24 hours'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Fonction pour obtenir les meilleures règles d'automatisation
CREATE OR REPLACE FUNCTION get_top_performing_rules(limit_param integer DEFAULT 10)
RETURNS TABLE (
  rule_id uuid,
  rule_type text,
  success_rate numeric,
  roi_score numeric,
  efficiency_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.rule_id,
    r.rule_type,
    CASE WHEN r.executions > 0 
      THEN (r.successes::numeric / r.executions::numeric) * 100
      ELSE 0
    END as success_rate,
    COALESCE(r.roi_score, 0),
    COALESCE(r.efficiency_score, 0)
  FROM rule_performance_tracking r
  WHERE r.should_keep = true
  ORDER BY r.efficiency_score DESC NULLS LAST, r.roi_score DESC NULLS LAST
  LIMIT limit_param;
END;
$$;
