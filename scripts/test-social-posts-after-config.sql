-- Script de vérification après configuration du secret OPENAI_API_KEY
-- À exécuter 5 minutes après avoir ajouté le secret dans Supabase Vault

-- 1. Déclencher un test manuel Pinterest
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg"}'::jsonb,
  body := '{"platform": "pinterest", "action": "auto_post"}'::jsonb,
  timeout_milliseconds := 30000
) AS test_pinterest;

-- Attendre 5 secondes
SELECT pg_sleep(5);

-- 2. Vérifier qu'un post a été créé
SELECT
  id,
  platform,
  SUBSTRING(content, 1, 200) as apercu_contenu,
  status,
  error_message,
  created_at
FROM social_posts
WHERE platform = 'pinterest'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Si succès, tester LinkedIn
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg"}'::jsonb,
  body := '{"platform": "linkedin", "action": "auto_post"}'::jsonb,
  timeout_milliseconds := 30000
) AS test_linkedin;

-- Attendre 5 secondes
SELECT pg_sleep(5);

-- 4. Vérifier tous les posts créés
SELECT
  platform,
  SUBSTRING(content, 1, 150) as apercu,
  status,
  error_message,
  created_at
FROM social_posts
ORDER BY created_at DESC
LIMIT 5;

-- 5. Voir les statistiques
SELECT
  platform,
  COUNT(*) as total_posts,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as publiés,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as échoués,
  MAX(created_at) as dernière_publication
FROM social_posts
GROUP BY platform;

-- 6. Confirmer que les crons sont actifs
SELECT
  jobname,
  schedule,
  active,
  last_run_start_time,
  last_run_status
FROM cron.job
WHERE jobname LIKE '%pinterest%' OR jobname LIKE '%linkedin%'
ORDER BY jobname;
