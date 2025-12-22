-- ========================================
-- CONFIGURATION CRON JOBS - TAXIASSUR
-- ========================================
-- ⚠️ REMPLACER AVANT D'EXÉCUTER :
-- 1. VOTRE_REF_PROJET (ex: abcdefghijklmnop)
-- 2. VOTRE_SERVICE_ROLE_KEY (Settings → API → service_role)
-- ========================================

-- Étape 1 : Activer extension pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Étape 2 : Scraping Social (Toutes les 6h)
SELECT cron.schedule(
  'ai-social-scraper-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-social-scraper',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik'
    )
  ) AS request_id;
  $$
);

-- Étape 3 : Email Auto-Responder (Toutes les 30 min)
SELECT cron.schedule(
  'ai-email-responder-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-email-responder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik'
    )
  ) AS request_id;
  $$
);

-- Étape 4 : Calcul Stats Ambassadeurs (Quotidien à 1h du matin)
SELECT cron.schedule(
  'calculate-ambassador-rankings-daily',
  '0 1 * * *',
  $$
  SELECT calculate_monthly_rankings();
  $$
);

-- Étape 5 : Monitoring Engagement (Toutes les heures)
SELECT cron.schedule(
  'engagement-monitoring-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-engagement-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik'
    )
  ) AS request_id;
  $$
);

-- Vérification : Voir tous les crons créés
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
ORDER BY jobid;

-- Test manuel immédiat (optionnel)
-- Décommenter et remplacer pour tester :
/*
SELECT net.http_post(
  url := 'https://VOTRE_REF_PROJET.supabase.co/functions/v1/ai-social-scraper',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY'
  )
);
*/
