-- ========================================
-- VÉRIFICATION COMPLÈTE DES CRON JOBS
-- ========================================

-- 1. Liste TOUS les cron jobs actifs
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  nodename,
  nodeport,
  database
FROM cron.job
ORDER BY jobname;

-- 2. Dernières exécutions des jobs blog
SELECT 
  job_name,
  status,
  executed_at,
  execution_time_ms,
  created_count,
  error_message,
  details
FROM cron_execution_log
WHERE job_name LIKE '%blog%'
ORDER BY executed_at DESC
LIMIT 20;

-- 3. Fréquence réelle des exécutions (dernière heure)
SELECT 
  job_name,
  COUNT(*) as executions_last_hour,
  MIN(executed_at) as first_execution,
  MAX(executed_at) as last_execution,
  EXTRACT(EPOCH FROM (MAX(executed_at) - MIN(executed_at))) / NULLIF(COUNT(*) - 1, 0) as avg_seconds_between
FROM cron_execution_log
WHERE executed_at > NOW() - INTERVAL '1 hour'
  AND job_name LIKE '%blog%'
GROUP BY job_name;

-- 4. Compter les articles créés aujourd'hui
SELECT 
  COUNT(*) as articles_today,
  MIN(created_at) as first_article,
  MAX(created_at) as last_article,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / NULLIF(COUNT(*) - 1, 0) as avg_seconds_between
FROM blog_posts
WHERE created_at::date = CURRENT_DATE
  AND category = 'actualites';

