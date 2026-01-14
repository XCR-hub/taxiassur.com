/*
  # Fix get_cron_jobs_stats RPC function

  1. Changes
    - Fix ORDER BY clause in aggregation query
    - Use subquery for proper ordering
    
  2. Purpose
    - Correctly retrieves all cron jobs with stats
*/

-- Drop and recreate the function with correct SQL
DROP FUNCTION IF EXISTS get_cron_jobs_stats();

CREATE OR REPLACE FUNCTION get_cron_jobs_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  jobs_data jsonb;
  stats_data jsonb;
  total_count int;
  active_count int;
  inactive_count int;
BEGIN
  -- Get all cron jobs with proper ordering
  SELECT jsonb_agg(job_data)
  INTO jobs_data
  FROM (
    SELECT jsonb_build_object(
      'jobid', j.jobid,
      'jobname', j.jobname,
      'schedule', j.schedule,
      'active', j.active,
      'command', j.command,
      'nodename', j.nodename,
      'database', j.database
    ) as job_data
    FROM cron.job j
    ORDER BY j.jobname
  ) ordered_jobs;

  -- Calculate stats
  SELECT 
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE active = true)::int,
    COUNT(*) FILTER (WHERE active = false)::int
  INTO total_count, active_count, inactive_count
  FROM cron.job;

  -- Build stats object
  stats_data := jsonb_build_object(
    'total', total_count,
    'active', active_count,
    'inactive', inactive_count
  );

  -- Return combined result
  RETURN jsonb_build_object(
    'jobs', COALESCE(jobs_data, '[]'::jsonb),
    'stats', stats_data
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_cron_jobs_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cron_jobs_stats() TO service_role;

COMMENT ON FUNCTION get_cron_jobs_stats() IS 'Returns all cron jobs with aggregated statistics for the monitoring dashboard';
