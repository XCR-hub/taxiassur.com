/*
  # Sécurisation des Fonctions - Search Path - Batch 1

  ## Résumé
  Ajout de SET search_path = public, pg_temp sur les fonctions pour prévenir les attaques SQL injection.
  
  ## Fonctions Sécurisées (Batch 1/3)
  1. check_lead_info_complete
  2. update_index_usage
  3. cleanup_old_monitoring_data
  4. get_top_performing_rules
  5. detect_metric_anomalies
  6. cleanup_old_rate_limit_attempts
  7. get_lead_complete_status
  8. calculate_automation_roi
  9. update_connection_pool_stats
  10. get_pipeline_statistics
  
  ## Sécurité
  - Protection contre SQL injection via search_path
  - Conforme OWASP Top 10
  - Standard Supabase
*/

-- 1. check_lead_info_complete
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_lead_info_complete') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'check_lead_info_complete' LIMIT 1
    );
    RAISE NOTICE '✅ check_lead_info_complete sécurisé';
  END IF;
END $$;

-- 2. update_index_usage
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_index_usage') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'update_index_usage' LIMIT 1
    );
    RAISE NOTICE '✅ update_index_usage sécurisé';
  END IF;
END $$;

-- 3. cleanup_old_monitoring_data
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_monitoring_data') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'cleanup_old_monitoring_data' LIMIT 1
    );
    RAISE NOTICE '✅ cleanup_old_monitoring_data sécurisé';
  END IF;
END $$;

-- 4. get_top_performing_rules
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_top_performing_rules') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'get_top_performing_rules' LIMIT 1
    );
    RAISE NOTICE '✅ get_top_performing_rules sécurisé';
  END IF;
END $$;

-- 5. detect_metric_anomalies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'detect_metric_anomalies') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'detect_metric_anomalies' LIMIT 1
    );
    RAISE NOTICE '✅ detect_metric_anomalies sécurisé';
  END IF;
END $$;

-- 6. cleanup_old_rate_limit_attempts
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_rate_limit_attempts') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'cleanup_old_rate_limit_attempts' LIMIT 1
    );
    RAISE NOTICE '✅ cleanup_old_rate_limit_attempts sécurisé';
  END IF;
END $$;

-- 7. get_lead_complete_status
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_lead_complete_status') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'get_lead_complete_status' LIMIT 1
    );
    RAISE NOTICE '✅ get_lead_complete_status sécurisé';
  END IF;
END $$;

-- 8. calculate_automation_roi
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_automation_roi') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'calculate_automation_roi' LIMIT 1
    );
    RAISE NOTICE '✅ calculate_automation_roi sécurisé';
  END IF;
END $$;

-- 9. update_connection_pool_stats
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_connection_pool_stats') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'update_connection_pool_stats' LIMIT 1
    );
    RAISE NOTICE '✅ update_connection_pool_stats sécurisé';
  END IF;
END $$;

-- 10. get_pipeline_statistics
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_pipeline_statistics') THEN
    EXECUTE (
      SELECT 'ALTER FUNCTION ' || p.oid::regprocedure::text || ' SET search_path = public, pg_temp'
      FROM pg_proc p WHERE p.proname = 'get_pipeline_statistics' LIMIT 1
    );
    RAISE NOTICE '✅ get_pipeline_statistics sécurisé';
  END IF;
END $$;

-- Rapport
DO $$ BEGIN
  RAISE NOTICE '✅ Batch 1: 10 fonctions sécurisées';
END $$;
