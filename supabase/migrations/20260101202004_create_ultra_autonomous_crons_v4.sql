/*
  # Configuration des Crons pour le Système Ultra-Autonome
  
  Configure tous les crons pour exécution automatique 24/7 :
  
  1. **Self-Healing** - Toutes les 15 minutes
  2. **Monitoring temps réel** - Toutes les 5 minutes
  3. **Optimisation prompts IA** - Toutes les 6 heures
  4. **Pattern Learning** - Toutes les 12 heures
  5. **Tests A/B** - Quotidien à 3h du matin
  6. **Nettoyage système** - Hebdomadaire le dimanche à 2h
*/

-- ==========================================
-- 1. SELF-HEALING - Toutes les 15 minutes
-- ==========================================

SELECT cron.schedule(
  'ultra_autonomous_self_healer',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/ultra-autonomous-self-healer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ==========================================
-- 2. MONITORING TEMPS RÉEL - Toutes les 5 minutes
-- ==========================================

SELECT cron.schedule(
  'realtime_monitoring_engine',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/realtime-monitoring-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ==========================================
-- 3. OPTIMISATION PROMPTS IA - Toutes les 6 heures
-- ==========================================

SELECT cron.schedule(
  'ai_prompt_optimizer_analyze',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/ai-prompt-optimizer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('task', 'analyze')
  );
  $$
);

-- ==========================================
-- 4. PATTERN LEARNING - Toutes les 12 heures
-- ==========================================

SELECT cron.schedule(
  'pattern_learning_engine',
  '0 */12 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/pattern-learning-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ==========================================
-- 5. TESTS A/B - Quotidien à 3h du matin
-- ==========================================

SELECT cron.schedule(
  'ai_prompt_optimizer_test',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/ai-prompt-optimizer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('task', 'test')
  );
  $$
);

-- ==========================================
-- 6. NETTOYAGE SYSTÈME - Hebdomadaire dimanche 2h
-- ==========================================

SELECT cron.schedule(
  'system_cleanup_weekly',
  '0 2 * * 0',
  $$
  -- Nettoyer les anciennes métriques (> 90 jours)
  DELETE FROM realtime_metrics 
  WHERE measurement_time < NOW() - INTERVAL '90 days';
  
  -- Nettoyer les anciennes anomalies résolues (> 60 jours)
  DELETE FROM system_anomalies 
  WHERE created_at < NOW() - INTERVAL '60 days'
  AND auto_handled = true;
  
  -- Nettoyer les anciens health checks (> 30 jours)
  DELETE FROM system_health_checks 
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND status = 'healthy';
  
  -- Nettoyer les anciennes alertes acquittées (> 30 jours)
  DELETE FROM smart_alerts 
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND acknowledged = true;
  
  -- Nettoyer les anciens patterns faibles (< 50 de confidence et > 60 jours)
  DELETE FROM discovered_patterns 
  WHERE created_at < NOW() - INTERVAL '60 days'
  AND confidence_score < 50
  AND NOT rule_created;
  
  -- Archiver les anciennes prédictions (> 90 jours)
  DELETE FROM predictive_analytics 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Archiver les anciens tests A/B terminés (> 60 jours)
  DELETE FROM ab_test_experiments 
  WHERE ended_at < NOW() - INTERVAL '60 days'
  AND status = 'completed';
  $$
);

-- ==========================================
-- 7. CALCUL ROI AUTOMATISATIONS - Quotidien à 4h
-- ==========================================

SELECT cron.schedule(
  'calculate_automation_roi_daily',
  '0 4 * * *',
  $$
  -- Mettre à jour les ROI de toutes les automatisations
  UPDATE automation_roi_tracking
  SET 
    roi_percent = CASE 
      WHEN cost_per_execution * total_executions > 0 
      THEN ((value_generated - (cost_per_execution * total_executions)) / (cost_per_execution * total_executions)) * 100
      ELSE 0
    END,
    efficiency_score = CASE 
      WHEN total_executions > 0 
      THEN (successful_executions::numeric / total_executions::numeric) * 100
      ELSE 0
    END,
    updated_at = NOW();
  
  -- Mettre à jour les recommandations
  UPDATE automation_roi_tracking
  SET recommendation = CASE
    WHEN roi_percent < 0 THEN 'Désactiver - ROI négatif'
    WHEN roi_percent < 50 THEN 'Optimiser - ROI faible'
    WHEN roi_percent < 200 THEN 'Maintenir - ROI correct'
    ELSE 'Excellent - Continuer'
  END;
  $$
);

-- ==========================================
-- 8. MISE À JOUR TRACKING RULES - Toutes les heures
-- ==========================================

SELECT cron.schedule(
  'update_rule_performance_tracking',
  '30 * * * *',
  $$
  -- Calculer le ROI de chaque règle
  UPDATE rule_performance_tracking r
  SET 
    efficiency_score = CASE 
      WHEN r.executions > 0 
      THEN (r.successes::numeric / r.executions::numeric) * 100
      ELSE 0
    END,
    should_keep = CASE
      WHEN r.executions < 10 THEN true
      WHEN (r.successes::numeric / NULLIF(r.executions, 0)) >= 0.7 THEN true
      ELSE false
    END,
    should_optimize = CASE
      WHEN r.executions >= 10 
        AND (r.successes::numeric / NULLIF(r.executions, 0)) < 0.7 
        AND (r.successes::numeric / NULLIF(r.executions, 0)) >= 0.5 
      THEN true
      ELSE false
    END,
    updated_at = NOW()
  WHERE r.updated_at < NOW() - INTERVAL '1 hour';
  $$
);

-- ==========================================
-- FONCTIONS POUR VÉRIFIER LES CRONS
-- ==========================================

CREATE OR REPLACE FUNCTION get_active_crons()
RETURNS TABLE (
  jobname text,
  schedule text,
  active boolean,
  jobid bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobname::text,
    j.schedule::text,
    j.active,
    j.jobid
  FROM cron.job j
  WHERE j.jobname LIKE 'ultra_autonomous%' 
    OR j.jobname LIKE '%pattern%'
    OR j.jobname LIKE '%ai_prompt%'
    OR j.jobname LIKE '%monitoring%'
    OR j.jobname LIKE '%cleanup%'
  ORDER BY j.jobname;
END;
$$;

-- Fonction pour obtenir le statut du système autonome
CREATE OR REPLACE FUNCTION get_autonomous_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  active_crons_count integer;
  recent_health_checks integer;
  recent_patterns integer;
  recent_improvements integer;
BEGIN
  SELECT COUNT(*) INTO active_crons_count
  FROM cron.job 
  WHERE active = true 
  AND (jobname LIKE 'ultra_autonomous%' 
    OR jobname LIKE '%pattern%'
    OR jobname LIKE '%ai_prompt%'
    OR jobname LIKE '%monitoring%');
  
  SELECT COUNT(*) INTO recent_health_checks
  FROM system_health_checks
  WHERE created_at > NOW() - INTERVAL '1 hour';
  
  SELECT COUNT(*) INTO recent_patterns
  FROM discovered_patterns
  WHERE created_at > NOW() - INTERVAL '24 hours';
  
  SELECT COUNT(*) INTO recent_improvements
  FROM autonomous_improvements
  WHERE created_at > NOW() - INTERVAL '24 hours'
  AND auto_applied = true;
  
  SELECT jsonb_build_object(
    'status', CASE 
      WHEN active_crons_count >= 5 AND recent_health_checks > 0 THEN 'fully_operational'
      WHEN active_crons_count > 0 THEN 'partially_operational'
      ELSE 'not_operational'
    END,
    'active_crons', active_crons_count,
    'health_checks_last_hour', recent_health_checks,
    'patterns_discovered_24h', recent_patterns,
    'auto_improvements_24h', recent_improvements,
    'last_check', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$;
