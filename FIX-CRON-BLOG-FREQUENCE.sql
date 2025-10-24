-- ========================================
-- FIX FRÉQUENCE CRON BLOG
-- ========================================
-- Le cron blog doit s'exécuter UNE SEULE FOIS PAR JOUR
-- PAS toutes les minutes !

-- 1. Vérifier le cron actuel
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname LIKE '%blog%';

-- 2. DÉSACTIVER tous les crons blog existants
UPDATE cron.job
SET active = false
WHERE jobname LIKE '%blog%';

-- 3. SUPPRIMER les anciens crons blog
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname LIKE '%blog%';

-- 4. RECRÉER le cron CORRECTEMENT (1 fois par jour à 10h)
SELECT cron.schedule(
  'generate_daily_blog_post',
  '0 10 * * *',  -- Une fois par jour à 10h00
  $$SELECT generate_daily_blog_post();$$
);

-- 5. Vérification finale
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  CASE 
    WHEN schedule = '0 10 * * *' THEN '✅ CORRECT (1x/jour à 10h)'
    WHEN schedule LIKE '%* * * * *%' THEN '❌ TROP FRÉQUENT (toutes les minutes)'
    WHEN schedule LIKE '%/5 * * * *%' THEN '⚠️ Toutes les 5 minutes'
    WHEN schedule LIKE '%/15 * * * *%' THEN '⚠️ Toutes les 15 minutes'
    ELSE schedule
  END as frequency_status
FROM cron.job
WHERE jobname LIKE '%blog%';

-- 6. Statistiques de publication
SELECT 
  DATE(created_at) as date,
  COUNT(*) as nb_articles,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ NORMAL (1 article/jour)'
    WHEN COUNT(*) > 1 AND COUNT(*) <= 5 THEN '⚠️ Acceptable'
    WHEN COUNT(*) > 5 THEN '❌ TROP (bug cron)'
  END as status
FROM blog_posts
WHERE category = 'actualites'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

