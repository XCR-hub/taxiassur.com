/*
  # RPC: get_ai_governance_status
  Retourne le statut du système de gouvernance IA automatique:
  - Date du dernier run de chaque cron
  - Nombre de décisions par statut sur les dernières 24h
  - Indique si les crons sont actifs
*/

CREATE OR REPLACE FUNCTION get_ai_governance_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  last_generate timestamptz;
  last_approve timestamptz;
  gen_jobid bigint;
  approve_jobid bigint;
BEGIN
  SELECT j.jobid INTO gen_jobid FROM cron.job j WHERE j.jobname = 'ai-governance-generate-decisions-2h';
  SELECT j.jobid INTO approve_jobid FROM cron.job j WHERE j.jobname = 'ai-governance-auto-approve-1h';

  IF gen_jobid IS NOT NULL THEN
    SELECT d.end_time INTO last_generate
    FROM cron.job_run_details d
    WHERE d.jobid = gen_jobid AND d.status = 'succeeded'
    ORDER BY d.end_time DESC LIMIT 1;
  END IF;

  IF approve_jobid IS NOT NULL THEN
    SELECT d.end_time INTO last_approve
    FROM cron.job_run_details d
    WHERE d.jobid = approve_jobid AND d.status = 'succeeded'
    ORDER BY d.end_time DESC LIMIT 1;
  END IF;

  SELECT jsonb_build_object(
    'crons_active', (gen_jobid IS NOT NULL AND approve_jobid IS NOT NULL),
    'last_generate', last_generate,
    'last_approve', last_approve,
    'next_generate_in_minutes', EXTRACT(EPOCH FROM (
      date_trunc('hour', NOW()) + INTERVAL '2 hours' * CEIL(EXTRACT(EPOCH FROM (NOW() - date_trunc('hour', NOW()))) / 7200) - NOW()
    )) / 60,
    'stats_24h', (
      SELECT jsonb_build_object(
        'generated', COUNT(*) FILTER (WHERE status = 'pending'),
        'approved', COUNT(*) FILTER (WHERE status = 'approved'),
        'auto_applied', COUNT(*) FILTER (WHERE status = 'auto_applied'),
        'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
        'total', COUNT(*)
      )
      FROM crm_ai_decisions
      WHERE created_at > NOW() - INTERVAL '24 hours'
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_ai_governance_status() TO authenticated;
