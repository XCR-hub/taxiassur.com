/*
  # Créer fonction get_automations_with_stats
  
  Récupère toutes les automatisations avec leurs statistiques réelles depuis:
  - cron.job (configuration et statut)
  - automation_logs (historique d'exécution)
  
  Retourne: jobid, jobname, schedule, active, total_runs, successful_runs, last_run_at
*/

-- Fonction pour récupérer automatisations avec stats
CREATE OR REPLACE FUNCTION get_automations_with_stats()
RETURNS TABLE (
  id bigint,
  name text,
  description text,
  is_enabled boolean,
  frequency text,
  total_runs bigint,
  successful_runs bigint,
  failed_runs bigint,
  success_rate numeric,
  last_run_at timestamptz,
  last_error text,
  next_run_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobid as id,
    j.jobname as name,
    COALESCE(j.command, 'Automatisation') as description,
    j.active as is_enabled,
    j.schedule as frequency,
    
    -- Stats depuis automation_logs
    COALESCE(
      (SELECT COUNT(*)::bigint FROM public.automation_logs WHERE job_name = j.jobname),
      0::bigint
    ) as total_runs,
    
    COALESCE(
      (SELECT COUNT(*)::bigint FROM public.automation_logs WHERE job_name = j.jobname AND status = 'success'),
      0::bigint
    ) as successful_runs,
    
    COALESCE(
      (SELECT COUNT(*)::bigint FROM public.automation_logs WHERE job_name = j.jobname AND status = 'error'),
      0::bigint
    ) as failed_runs,
    
    -- Taux de réussite
    CASE 
      WHEN (SELECT COUNT(*) FROM public.automation_logs WHERE job_name = j.jobname) > 0 THEN
        ROUND(
          (SELECT COUNT(*)::numeric FROM public.automation_logs WHERE job_name = j.jobname AND status = 'success') * 100.0 /
          (SELECT COUNT(*)::numeric FROM public.automation_logs WHERE job_name = j.jobname),
          1
        )
      ELSE
        0
    END as success_rate,
    
    -- Dernière exécution
    (SELECT MAX(created_at) FROM public.automation_logs WHERE job_name = j.jobname) as last_run_at,
    
    -- Dernière erreur
    (
      SELECT message 
      FROM public.automation_logs 
      WHERE job_name = j.jobname AND status = 'error'
      ORDER BY created_at DESC 
      LIMIT 1
    ) as last_error,
    
    -- Prochaine exécution (estimée)
    CASE 
      WHEN j.active THEN 
        (SELECT MAX(created_at) + INTERVAL '1 hour' FROM public.automation_logs WHERE job_name = j.jobname)
      ELSE 
        NULL
    END as next_run_at
    
  FROM cron.job j
  WHERE j.jobname NOT LIKE '%test%'  -- Exclure jobs de test
  ORDER BY j.jobname;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_automations_with_stats() TO anon, authenticated, service_role;

-- Fonction pour récupérer les stats globales
CREATE OR REPLACE FUNCTION get_automation_global_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_total_jobs integer;
  v_active_jobs integer;
  v_total_executions bigint;
  v_successful_executions bigint;
  v_failed_executions bigint;
  v_success_rate numeric;
BEGIN
  -- Compter jobs
  SELECT COUNT(*) INTO v_total_jobs
  FROM cron.job
  WHERE jobname NOT LIKE '%test%';
  
  SELECT COUNT(*) INTO v_active_jobs
  FROM cron.job
  WHERE active = true AND jobname NOT LIKE '%test%';
  
  -- Stats exécutions
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'success'),
    COUNT(*) FILTER (WHERE status = 'error')
  INTO v_total_executions, v_successful_executions, v_failed_executions
  FROM public.automation_logs
  WHERE created_at > NOW() - INTERVAL '7 days';  -- Derniers 7 jours
  
  -- Taux de réussite
  IF v_total_executions > 0 THEN
    v_success_rate := ROUND((v_successful_executions::numeric / v_total_executions::numeric) * 100, 1);
  ELSE
    v_success_rate := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'total_jobs', v_total_jobs,
    'active_jobs', v_active_jobs,
    'total_executions', v_total_executions,
    'successful_executions', v_successful_executions,
    'failed_executions', v_failed_executions,
    'success_rate', v_success_rate,
    'last_update', NOW()
  );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_automation_global_stats() TO anon, authenticated, service_role;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fonctions créées avec succès:';
  RAISE NOTICE '   - get_automations_with_stats()';
  RAISE NOTICE '   - get_automation_global_stats()';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Test rapide:';
  RAISE NOTICE '   SELECT * FROM get_automations_with_stats() LIMIT 5;';
  RAISE NOTICE '   SELECT get_automation_global_stats();';
END $$;
