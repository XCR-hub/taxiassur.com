/*
  # Fix get_automations_with_stats - Colonne automation_logs
  
  Problème: La fonction utilise "job_name" mais la colonne réelle
  peut être "automation_name", "job_name" ou "automation_type"
  
  Solution: Détecter automatiquement la bonne colonne et adapter la requête
*/

-- Supprimer fonction existante
DROP FUNCTION IF EXISTS get_automations_with_stats() CASCADE;

-- Recréer avec détection automatique
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
DECLARE
  v_column_name text;
BEGIN
  -- Détecter quelle colonne existe dans automation_logs
  SELECT column_name INTO v_column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'automation_logs'
    AND column_name IN ('job_name', 'automation_name', 'automation_type')
  LIMIT 1;
  
  -- Si aucune colonne trouvée, utiliser job_name par défaut
  IF v_column_name IS NULL THEN
    v_column_name := 'job_name';
  END IF;
  
  -- Retourner les résultats en utilisant la colonne détectée
  RETURN QUERY EXECUTE format($query$
    SELECT
      j.jobid::bigint as id,
      j.jobname as name,
      COALESCE(j.command, 'Automatisation') as description,
      j.active as is_enabled,
      j.schedule as frequency,
      
      -- Total runs
      COALESCE(
        (SELECT COUNT(*)::bigint FROM public.automation_logs WHERE %I = j.jobname),
        0::bigint
      ) as total_runs,
      
      -- Successful runs
      COALESCE(
        (SELECT COUNT(*)::bigint FROM public.automation_logs 
         WHERE %I = j.jobname AND status = 'success'),
        0::bigint
      ) as successful_runs,
      
      -- Failed runs
      COALESCE(
        (SELECT COUNT(*)::bigint FROM public.automation_logs 
         WHERE %I = j.jobname AND status = 'error'),
        0::bigint
      ) as failed_runs,
      
      -- Success rate
      CASE 
        WHEN (SELECT COUNT(*) FROM public.automation_logs WHERE %I = j.jobname) > 0 THEN
          ROUND(
            (SELECT COUNT(*)::numeric FROM public.automation_logs 
             WHERE %I = j.jobname AND status = 'success') * 100.0 /
            (SELECT COUNT(*)::numeric FROM public.automation_logs WHERE %I = j.jobname),
            1
          )
        ELSE
          0
      END as success_rate,
      
      -- Last run
      (SELECT MAX(created_at) FROM public.automation_logs WHERE %I = j.jobname) as last_run_at,
      
      -- Last error
      (SELECT message FROM public.automation_logs 
       WHERE %I = j.jobname AND status = 'error'
       ORDER BY created_at DESC 
       LIMIT 1) as last_error,
      
      -- Next run (estimated)
      CASE 
        WHEN j.active THEN 
          (SELECT MAX(created_at) + INTERVAL '1 hour' 
           FROM public.automation_logs WHERE %I = j.jobname)
        ELSE 
          NULL
      END as next_run_at
      
    FROM cron.job j
    WHERE j.jobname NOT LIKE '%%test%%'
    ORDER BY j.jobname
  $query$,
  v_column_name, v_column_name, v_column_name, v_column_name, 
  v_column_name, v_column_name, v_column_name, v_column_name, v_column_name
  );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_automations_with_stats() TO anon, authenticated, service_role;

-- Vérification
DO $$
DECLARE
  v_count integer;
  v_column_name text;
BEGIN
  -- Vérifier colonne
  SELECT column_name INTO v_column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'automation_logs'
    AND column_name IN ('job_name', 'automation_name', 'automation_type')
  LIMIT 1;
  
  -- Test fonction
  SELECT COUNT(*) INTO v_count FROM get_automations_with_stats();
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Fonction get_automations_with_stats() corrigée';
  RAISE NOTICE '   Colonne détectée: %', COALESCE(v_column_name, 'job_name (défaut)');
  RAISE NOTICE '   Automatisations trouvées: %', v_count;
  RAISE NOTICE '============================================';
END $$;
