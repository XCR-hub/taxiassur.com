/*
  # Rotate service_role_key (legacy JWT invalidé par Supabase)

  1. Contexte
    - Les Edge Functions de sync IMAP renvoyaient HTTP 401 UNAUTHORIZED_LEGACY_JWT
      depuis le 17/04/2026, bloquant la réception des emails.
    - La clé stockée dans system_config.supabase_service_role_key était au
      format legacy JWT, désormais rejeté par Supabase.

  2. Action
    - Mise à jour de la valeur dans system_config avec la nouvelle clé fournie.
    - Mise à jour des cron jobs ai_email_responder_hourly (367) et
      ga4-signals-sync-6h (510) qui contiennent la clé en dur dans leur SQL.

  3. Sécurité
    - La table system_config est déjà protégée par RLS, aucune modification nécessaire.
*/

UPDATE system_config
SET
  value = 'REDACTED_SUPABASE_SERVICE_ROLE_JWT',
  updated_at = now()
WHERE key = 'supabase_service_role_key';

DO $$
DECLARE
  v_new_key text := 'REDACTED_SUPABASE_SERVICE_ROLE_JWT';
  v_job record;
  v_new_command text;
BEGIN
  FOR v_job IN
    SELECT jobid, jobname, schedule, command
    FROM cron.job
    WHERE command ~ 'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'
  LOOP
    v_new_command := regexp_replace(
      v_job.command,
      'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',
      v_new_key,
      'g'
    );
    IF v_new_command IS DISTINCT FROM v_job.command THEN
      PERFORM cron.unschedule(v_job.jobid);
      PERFORM cron.schedule(v_job.jobname, v_job.schedule, v_new_command);
      RAISE NOTICE 'Rotated JWT in cron job: % (jobid=%)', v_job.jobname, v_job.jobid;
    END IF;
  END LOOP;
END $$;
