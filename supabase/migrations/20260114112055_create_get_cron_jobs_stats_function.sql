/*
  # Create get_cron_jobs_stats RPC function

  1. New Function
    - `get_cron_jobs_stats()` - Retrieves all cron jobs with stats
    
  2. Purpose
    - Provides access to pg_cron jobs for the backoffice monitoring dashboard
    - Returns jobs list and aggregated statistics
    
  3. Security
    - Function is SECURITY DEFINER to access cron schema
    - Only accessible to authenticated users
*/

-- Create the function to get cron jobs with stats
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
  -- Get all cron jobs
  SELECT jsonb_agg(
    jsonb_build_object(
      'jobid', j.jobid,
      'jobname', j.jobname,
      'schedule', j.schedule,
      'active', j.active,
      'command', j.command,
      'nodename', j.nodename,
      'database', j.database
    )
  )
  INTO jobs_data
  FROM cron.job j
  ORDER BY j.jobname;

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
