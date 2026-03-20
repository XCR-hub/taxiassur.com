/*
  # ULTRON - Cron appel edge function ultron-site-healer toutes les heures
  Lance l'audit + reparation automatique via la edge function avec acces complet
*/

-- Supprimer si existe deja
SELECT cron.unschedule('ultron-site-healer-1h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ultron-site-healer-1h');

-- Cron toutes les heures : audit complet + reparation via edge function
SELECT cron.schedule(
  'ultron-site-healer-1h',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/ultron-site-healer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := '{"mode":"full"}',
    timeout_milliseconds := 30000
  );
  $$
);

-- Cron leger toutes les 30 min (SQL seulement, sans edge function)
SELECT cron.unschedule('ultron-db-audit-30min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ultron-db-audit-30min');

SELECT cron.schedule(
  'ultron-db-audit-30min',
  '*/30 * * * *',
  $$SELECT ultron_audit_full_site();$$
);
