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
  value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
  updated_at = now()
WHERE key = 'supabase_service_role_key';

DO $$
DECLARE
  v_new_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik';
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
