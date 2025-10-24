-- Appliquer la migration de logging (copier/coller dans Supabase SQL Editor)

-- Test 1: Exécuter manuellement generate_daily_blog_post
SELECT generate_daily_blog_post();

-- Test 2: Exécuter manuellement generate_weekly_faq  
SELECT generate_weekly_faq();

-- Test 3: Exécuter manuellement generate_city_pages
SELECT generate_city_pages();

-- Test 4: Voir les statistiques
SELECT * FROM get_cron_execution_stats();

-- Test 5: Voir les dernières exécutions
SELECT 
  job_name,
  status,
  executed_at,
  execution_time_ms,
  created_count,
  error_message
FROM cron_execution_log
ORDER BY executed_at DESC
LIMIT 20;
