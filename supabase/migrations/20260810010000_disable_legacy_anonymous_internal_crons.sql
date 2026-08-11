-- Disable obsolete cron duplicates that invoke privileged internal functions with
-- the public anon key. Newer jobs configured with service_role remain untouched.
DO $migration$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    UPDATE cron.job
    SET active = false
    WHERE active
      AND command ~* '(supabase_anon_key|anon_key)'
      AND command ~* '/functions/v1/(sync-all-emails-complete|sync-ionos-imap|sync-ionos-imap-documents|fetch-email-replies|auto-create-leads-from-emails|auto-process-email-attachments)';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING 'Unable to disable legacy cron jobs with the migration role; protected functions will reject anonymous calls.';
END
$migration$;