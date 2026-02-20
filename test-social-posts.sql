-- Test 1: Vérifier l'état des connexions
SELECT 
  platform,
  is_connected,
  auto_publish,
  total_posts,
  last_post_at
FROM social_networks
WHERE platform IN ('pinterest', 'linkedin');

-- Test 2: Vérifier les derniers posts
SELECT 
  platform,
  content,
  status,
  error_message,
  created_at
FROM social_posts
WHERE platform IN ('pinterest', 'linkedin')
ORDER BY created_at DESC
LIMIT 5;

-- Test 3: Voir les crons actifs
SELECT 
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%pinterest%' OR jobname LIKE '%linkedin%'
ORDER BY jobname;
