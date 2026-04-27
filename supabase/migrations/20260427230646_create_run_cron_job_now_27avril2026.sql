/*
  # Real test execution for automations

  Adds run_cron_job_now(p_name) RPC that:
  1. Looks up the cron.job command by name
  2. Executes that command (the same SQL the scheduler would run)
  3. Inserts a row in public.automation_logs with success/error status

  This replaces the fake client-side simulation so success/failure counters
  and Réussite % update from real test runs triggered via the UI.
*/

CREATE OR REPLACE FUNCTION public.run_cron_job_now(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_command text;
  v_started_at timestamptz := clock_timestamp();
  v_duration_ms integer;
  v_log_column text;
  v_error_message text;
BEGIN
  SELECT command INTO v_command
  FROM cron.job
  WHERE jobname = p_name
  LIMIT 1;

  IF v_command IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', format('Cron job %s introuvable', p_name));
  END IF;

  SELECT column_name INTO v_log_column
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'automation_logs'
    AND column_name IN ('automation_name', 'job_name', 'automation_type')
  LIMIT 1;

  IF v_log_column IS NULL THEN
    v_log_column := 'automation_name';
  END IF;

  BEGIN
    EXECUTE v_command;

    v_duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started_at)::integer;

    EXECUTE format(
      'INSERT INTO public.automation_logs (%I, status, message, execution_time_ms) VALUES ($1, $2, $3, $4)',
      v_log_column
    ) USING p_name, 'success', 'Test manuel exécuté avec succès', v_duration_ms;

    RETURN jsonb_build_object(
      'success', true,
      'duration_ms', v_duration_ms,
      'job', p_name
    );
  EXCEPTION WHEN OTHERS THEN
    v_duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started_at)::integer;
    v_error_message := SQLERRM;

    EXECUTE format(
      'INSERT INTO public.automation_logs (%I, status, message, execution_time_ms) VALUES ($1, $2, $3, $4)',
      v_log_column
    ) USING p_name, 'error', v_error_message, v_duration_ms;

    RETURN jsonb_build_object(
      'success', false,
      'duration_ms', v_duration_ms,
      'job', p_name,
      'error', v_error_message
    );
  END;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.run_cron_job_now(text) TO authenticated;
