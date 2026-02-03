/*
  # Fix Email Sync Crons - Méthode Correcte
  
  1. Actions
    - Désactiver les anciens crons (jobid 446, 451, 452, 453)
    - Mettre à jour le cron principal (jobid 450) avec timeout étendu
    - Utiliser les fonctions pg_cron.unschedule() et pg_cron.schedule()
  
  2. Note
    - On ne peut pas UPDATE directement cron.job
    - Il faut utiliser unschedule() puis schedule() pour modifier
*/

-- 1. Désactiver les anciens crons en les supprimant
SELECT cron.unschedule(446);
SELECT cron.unschedule(451);
SELECT cron.unschedule(452);
SELECT cron.unschedule(453);

-- 2. Désactiver l'ancien cron 450 pour le recréer
SELECT cron.unschedule(450);

-- 3. Créer le nouveau cron amélioré avec timeout de 3 minutes
SELECT cron.schedule(
  'sync-all-emails-complete-v2',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/sync-all-emails-complete',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
    ),
    body := jsonb_build_object('limit', 50),
    timeout_milliseconds := 180000
  );
  $$
);

-- 4. Créer le cron de parsing automatique des formulaires
SELECT cron.schedule(
  'parse-form-emails-auto',
  '*/3 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/parse-form-emails-create-leads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
    ),
    body := jsonb_build_object('auto_create', true),
    timeout_milliseconds := 120000
  );
  $$
);

-- 5. Créer le cron de création automatique des leads depuis emails
SELECT cron.schedule(
  'auto-create-leads-from-emails',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/auto-create-leads-from-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
    ),
    body := jsonb_build_object(),
    timeout_milliseconds := 60000
  );
  $$
);

-- Vérification : lister tous les crons actifs
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE '%email%' OR jobname LIKE '%sync%'
ORDER BY jobid DESC;
