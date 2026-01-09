/*
  # Système de Monitoring Edge Functions Avancé
  
  1. Nouvelles Tables
    - edge_function_calls : Logs de tous les appels
    - edge_function_metrics : Métriques agrégées
    - edge_function_errors : Erreurs détaillées
    - edge_function_alerts : Alertes automatiques
  
  2. Fonctionnalités
    - Logs temps réel de tous les appels
    - Calcul métriques : temps réponse, taux succès, etc.
    - Détection erreurs et alertes automatiques
    - Dashboard monitoring complet
  
  3. Impact
    - Visibilité complète sur edge functions
    - Détection proactive des problèmes
    - Optimisation basée sur données réelles
*/

-- ============================================
-- TABLE : edge_function_calls
-- ============================================

CREATE TABLE IF NOT EXISTS edge_function_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  execution_time_ms integer,
  status text NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  request_size_bytes integer,
  response_size_bytes integer,
  memory_used_mb numeric(10,2),
  error_message text,
  error_stack text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index pour queries rapides
CREATE INDEX IF NOT EXISTS idx_edge_calls_function_created 
ON edge_function_calls(function_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_edge_calls_status 
ON edge_function_calls(status, created_at DESC);

-- RLS
ALTER TABLE edge_function_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access edge_function_calls"
ON edge_function_calls FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() AND is_active = true
  )
);

-- Service role peut insérer
CREATE POLICY "Service can insert edge_function_calls"
ON edge_function_calls FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- TABLE : edge_function_metrics (agrégées)
-- ============================================

CREATE TABLE IF NOT EXISTS edge_function_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  total_calls integer DEFAULT 0,
  success_calls integer DEFAULT 0,
  error_calls integer DEFAULT 0,
  timeout_calls integer DEFAULT 0,
  avg_execution_ms numeric(10,2),
  min_execution_ms integer,
  max_execution_ms integer,
  p95_execution_ms integer,
  avg_memory_mb numeric(10,2),
  total_errors integer DEFAULT 0,
  error_rate numeric(5,2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(function_name, period_start)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_metrics_function_period 
ON edge_function_metrics(function_name, period_start DESC);

-- RLS
ALTER TABLE edge_function_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read edge_function_metrics"
ON edge_function_metrics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() AND is_active = true
  )
);

-- ============================================
-- TABLE : edge_function_alerts
-- ============================================

CREATE TABLE IF NOT EXISTS edge_function_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('high_error_rate', 'slow_response', 'high_memory', 'frequent_timeouts')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message text NOT NULL,
  threshold_value numeric,
  current_value numeric,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved 
ON edge_function_alerts(function_name, is_resolved, created_at DESC);

-- RLS
ALTER TABLE edge_function_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access edge_function_alerts"
ON edge_function_alerts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() AND is_active = true
  )
);

-- ============================================
-- FONCTIONS : Calcul métriques automatique
-- ============================================

CREATE OR REPLACE FUNCTION calculate_edge_function_metrics(
  p_function_name text,
  p_period_minutes integer DEFAULT 60
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_metrics record;
BEGIN
  -- Période
  v_period_end := now();
  v_period_start := v_period_end - (p_period_minutes || ' minutes')::interval;

  -- Calculer métriques
  SELECT
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE status = 'success') as success_calls,
    COUNT(*) FILTER (WHERE status = 'error') as error_calls,
    COUNT(*) FILTER (WHERE status = 'timeout') as timeout_calls,
    AVG(execution_time_ms) as avg_execution_ms,
    MIN(execution_time_ms) as min_execution_ms,
    MAX(execution_time_ms) as max_execution_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_execution_ms,
    AVG(memory_used_mb) as avg_memory_mb
  INTO v_metrics
  FROM edge_function_calls
  WHERE function_name = p_function_name
    AND created_at >= v_period_start
    AND created_at < v_period_end;

  -- Insérer ou mettre à jour
  INSERT INTO edge_function_metrics (
    function_name,
    period_start,
    period_end,
    total_calls,
    success_calls,
    error_calls,
    timeout_calls,
    avg_execution_ms,
    min_execution_ms,
    max_execution_ms,
    p95_execution_ms,
    avg_memory_mb,
    total_errors,
    error_rate
  ) VALUES (
    p_function_name,
    v_period_start,
    v_period_end,
    v_metrics.total_calls,
    v_metrics.success_calls,
    v_metrics.error_calls,
    v_metrics.timeout_calls,
    v_metrics.avg_execution_ms,
    v_metrics.min_execution_ms,
    v_metrics.max_execution_ms,
    v_metrics.p95_execution_ms,
    v_metrics.avg_memory_mb,
    v_metrics.error_calls,
    CASE 
      WHEN v_metrics.total_calls > 0 
      THEN ROUND((v_metrics.error_calls::numeric / v_metrics.total_calls * 100)::numeric, 2)
      ELSE 0 
    END
  )
  ON CONFLICT (function_name, period_start) 
  DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    success_calls = EXCLUDED.success_calls,
    error_calls = EXCLUDED.error_calls,
    timeout_calls = EXCLUDED.timeout_calls,
    avg_execution_ms = EXCLUDED.avg_execution_ms,
    min_execution_ms = EXCLUDED.min_execution_ms,
    max_execution_ms = EXCLUDED.max_execution_ms,
    p95_execution_ms = EXCLUDED.p95_execution_ms,
    avg_memory_mb = EXCLUDED.avg_memory_mb,
    total_errors = EXCLUDED.total_errors,
    error_rate = EXCLUDED.error_rate;

  -- Vérifier si alertes nécessaires
  PERFORM check_edge_function_alerts(p_function_name);
END;
$$;

-- ============================================
-- FONCTION : Vérification alertes
-- ============================================

CREATE OR REPLACE FUNCTION check_edge_function_alerts(p_function_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_latest_metrics record;
BEGIN
  -- Récupérer dernières métriques
  SELECT * INTO v_latest_metrics
  FROM edge_function_metrics
  WHERE function_name = p_function_name
  ORDER BY period_start DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Alerte : Taux d'erreur élevé (>10%)
  IF v_latest_metrics.error_rate > 10 THEN
    INSERT INTO edge_function_alerts (
      function_name,
      alert_type,
      severity,
      message,
      threshold_value,
      current_value
    ) VALUES (
      p_function_name,
      'high_error_rate',
      CASE 
        WHEN v_latest_metrics.error_rate > 50 THEN 'critical'
        WHEN v_latest_metrics.error_rate > 25 THEN 'high'
        ELSE 'medium'
      END,
      format('Taux d''erreur élevé: %.2f%% (%s/%s appels)', 
        v_latest_metrics.error_rate,
        v_latest_metrics.error_calls,
        v_latest_metrics.total_calls
      ),
      10,
      v_latest_metrics.error_rate
    );
  END IF;

  -- Alerte : Temps de réponse lent (>5s)
  IF v_latest_metrics.avg_execution_ms > 5000 THEN
    INSERT INTO edge_function_alerts (
      function_name,
      alert_type,
      severity,
      message,
      threshold_value,
      current_value
    ) VALUES (
      p_function_name,
      'slow_response',
      CASE 
        WHEN v_latest_metrics.avg_execution_ms > 10000 THEN 'high'
        ELSE 'medium'
      END,
      format('Temps de réponse lent: %.2fms en moyenne', v_latest_metrics.avg_execution_ms),
      5000,
      v_latest_metrics.avg_execution_ms
    );
  END IF;

  -- Alerte : Mémoire élevée (>256MB)
  IF v_latest_metrics.avg_memory_mb > 256 THEN
    INSERT INTO edge_function_alerts (
      function_name,
      alert_type,
      severity,
      message,
      threshold_value,
      current_value
    ) VALUES (
      p_function_name,
      'high_memory',
      'medium',
      format('Consommation mémoire élevée: %.2f MB en moyenne', v_latest_metrics.avg_memory_mb),
      256,
      v_latest_metrics.avg_memory_mb
    );
  END IF;
END;
$$;

-- ============================================
-- FONCTION : Vue Dashboard Monitoring
-- ============================================

CREATE OR REPLACE FUNCTION get_edge_functions_health()
RETURNS TABLE (
  function_name text,
  last_24h_calls integer,
  success_rate numeric,
  avg_response_ms numeric,
  error_count integer,
  status text,
  last_call timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    efc.function_name,
    COUNT(*)::integer as last_24h_calls,
    ROUND((COUNT(*) FILTER (WHERE status = 'success')::numeric / COUNT(*) * 100)::numeric, 2) as success_rate,
    ROUND(AVG(execution_time_ms)::numeric, 2) as avg_response_ms,
    COUNT(*) FILTER (WHERE status = 'error')::integer as error_count,
    CASE
      WHEN COUNT(*) FILTER (WHERE status = 'error')::numeric / COUNT(*) > 0.5 THEN 'critical'
      WHEN COUNT(*) FILTER (WHERE status = 'error')::numeric / COUNT(*) > 0.25 THEN 'warning'
      WHEN AVG(execution_time_ms) > 5000 THEN 'slow'
      ELSE 'healthy'
    END as status,
    MAX(created_at) as last_call
  FROM edge_function_calls efc
  WHERE created_at >= now() - interval '24 hours'
  GROUP BY efc.function_name
  ORDER BY last_24h_calls DESC;
$$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE edge_function_calls IS 'Logs de tous les appels aux edge functions';
COMMENT ON TABLE edge_function_metrics IS 'Métriques agrégées par fonction et période';
COMMENT ON TABLE edge_function_alerts IS 'Alertes automatiques sur problèmes détectés';
COMMENT ON FUNCTION calculate_edge_function_metrics IS 'Calcule les métriques pour une fonction sur une période';
COMMENT ON FUNCTION check_edge_function_alerts IS 'Vérifie et crée des alertes si seuils dépassés';
COMMENT ON FUNCTION get_edge_functions_health IS 'Vue d''ensemble santé de toutes les edge functions';
