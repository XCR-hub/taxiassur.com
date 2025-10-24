/*
  # Correction: Fonction get_cron_execution_stats avec colonnes non ambiguës

  1. Corrections
    - Fix de la référence ambiguë à job_name dans la sous-requête
    - Utilisation de alias explicites pour éviter les conflits
*/

-- Drop et recréer la fonction avec la correction
DROP FUNCTION IF EXISTS get_cron_execution_stats();

CREATE OR REPLACE FUNCTION get_cron_execution_stats()
RETURNS TABLE(
  job_name TEXT,
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  last_execution TIMESTAMPTZ,
  last_status TEXT,
  avg_execution_time_ms NUMERIC,
  total_items_created BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cel.job_name,
    COUNT(*)::BIGINT as total_executions,
    COUNT(*) FILTER (WHERE cel.status = 'success')::BIGINT as successful_executions,
    COUNT(*) FILTER (WHERE cel.status = 'error')::BIGINT as failed_executions,
    MAX(cel.executed_at) as last_execution,
    (SELECT cel2.status
     FROM cron_execution_log cel2
     WHERE cel2.job_name = cel.job_name
     ORDER BY cel2.executed_at DESC
     LIMIT 1) as last_status,
    ROUND(AVG(cel.execution_time_ms), 2) as avg_execution_time_ms,
    SUM(COALESCE(cel.created_count, 0))::BIGINT as total_items_created
  FROM cron_execution_log cel
  GROUP BY cel.job_name
  ORDER BY cel.job_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION get_cron_execution_stats() TO anon, authenticated;
