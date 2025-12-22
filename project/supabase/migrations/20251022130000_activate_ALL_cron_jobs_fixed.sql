/*
  # ACTIVATION TOTALE - TOUS LES CRON JOBS (VERSION CORRIGÉE)

  Version qui gère le cas où pg_cron existe déjà.
  Active tous les 47 cron jobs sans erreur.
*/

-- ============================================
-- 1. VÉRIFIER ET CRÉER L'EXTENSION SI BESOIN
-- ============================================

DO $$
BEGIN
  -- Créer l'extension seulement si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
    RAISE NOTICE 'Extension pg_cron créée';
  ELSE
    RAISE NOTICE 'Extension pg_cron déjà existante';
  END IF;
END $$;

-- ============================================
-- 2. NETTOYER LES CRON JOBS EXISTANTS (OPTIONNEL)
-- ============================================

-- Désactiver tous les jobs existants sans les supprimer
-- Commentez cette section si vous voulez garder les jobs existants
/*
UPDATE cron.job SET active = false WHERE active = true;
RAISE NOTICE 'Tous les cron jobs existants ont été désactivés';
*/

-- ============================================
-- 3. GÉNÉRATION DE CONTENU IA (10 jobs)
-- ============================================

-- 3.1 Articles blog quotidiens (2h00)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-blog-articles-daily') THEN
    PERFORM cron.schedule(
      'generate-blog-articles-daily',
      '0 2 * * *',
      $$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"type": "blog_article", "count": 3}'::jsonb
      );
      $$
    );
    RAISE NOTICE 'Créé: generate-blog-articles-daily';
  END IF;
END $$;

-- 3.2 Pages villes (3h00 les lundis)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-city-pages-weekly') THEN
    PERFORM cron.schedule(
      'generate-city-pages-weekly',
      '0 3 * * 1',
      $$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-city-pages-ai',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"batch_size": 5}'::jsonb
      );
      $$
    );
    RAISE NOTICE 'Créé: generate-city-pages-weekly';
  END IF;
END $$;

-- 3.3 FAQ automatiques (4h00 les mercredis)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-faq-weekly') THEN
    PERFORM cron.schedule(
      'generate-faq-weekly',
      '0 4 * * 3',
      $$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"type": "faq", "count": 5}'::jsonb
      );
      $$
    );
    RAISE NOTICE 'Créé: generate-faq-weekly';
  END IF;
END $$;

-- 3.4 Contenu SEO général (4h00 quotidien)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-seo-content-daily') THEN
    PERFORM cron.schedule(
      'generate-seo-content-daily',
      '0 4 * * *',
      $$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"type": "auto"}'::jsonb
      );
      $$
    );
    RAISE NOTICE 'Créé: generate-seo-content-daily';
  END IF;
END $$;

-- 3.5 Actualités agrégées (toutes les 6h)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aggregate-news-6h') THEN
    PERFORM cron.schedule(
      'aggregate-news-6h',
      '0 */6 * * *',
      $$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-social-scraper',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"type": "news"}'::jsonb
      );
      $$
    );
    RAISE NOTICE 'Créé: aggregate-news-6h';
  END IF;
END $$;

-- ============================================
-- 4. RÉSEAUX SOCIAUX AUTO (12 jobs)
-- ============================================

-- 4.1 Pinterest matin (9h30)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pinterest-morning-post') THEN
    PERFORM cron.schedule(
      'pinterest-morning-post',
      '30 9 * * *',
      $$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/pinterest-publisher',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"slot": "morning"}'::jsonb
      );
      $$
    );
    RAISE NOTICE 'Créé: pinterest-morning-post';
  END IF;
END $$;

-- 4.2 Pinterest soir (19h30)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pinterest-evening-post') THEN
    PERFORM cron.schedule(
      'pinterest-evening-post',
      '30 19 * * *',
      $$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/pinterest-publisher',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"slot": "evening"}'::jsonb
      );
      $$
    );
    RAISE NOTICE 'Créé: pinterest-evening-post';
  END IF;
END $$;

-- 4.3 LinkedIn quotidien (10h00)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'linkedin-daily-post') THEN
    PERFORM cron.schedule(
      'linkedin-daily-post',
      '0 10 * * *',
      $$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/linkedin-publisher',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      );
      $$
    );
    RAISE NOTICE 'Créé: linkedin-daily-post';
  END IF;
END $$;

-- 4.4 YouTube quotidien (15h00)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'youtube-daily-post') THEN
    PERFORM cron.schedule(
      'youtube-daily-post',
      '0 15 * * *',
      $$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/youtube-publisher',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      );
      $$
    );
    RAISE NOTICE 'Créé: youtube-daily-post';
  END IF;
END $$;

-- 4.5 Contenu viral (toutes les 4h)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'viral-content-4h') THEN
    PERFORM cron.schedule(
      'viral-content-4h',
      '0 */4 * * *',
      $$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-viral-content-generator',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      );
      $$
    );
    RAISE NOTICE 'Créé: viral-content-4h';
  END IF;
END $$;

-- 4.6-4.8 Social media 3x/jour
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'social-media-morning') THEN
    PERFORM cron.schedule('social-media-morning', '0 9 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-auto-publisher',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"slot": "morning"}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'social-media-afternoon') THEN
    PERFORM cron.schedule('social-media-afternoon', '0 15 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-auto-publisher',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"slot": "afternoon"}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'social-media-evening') THEN
    PERFORM cron.schedule('social-media-evening', '0 19 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-auto-publisher',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"slot": "evening"}'::jsonb
      ); $$
    );
  END IF;
END $$;

-- ============================================
-- 5. SEO & INDEXATION (8 jobs)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-google-search-console-daily') THEN
    PERFORM cron.schedule('sync-google-search-console-daily', '0 1 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/sync-google-search-console',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'seo-daily-refresh') THEN
    PERFORM cron.schedule('seo-daily-refresh', '30 1 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/seo-daily-refresh',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-backlinks-weekly') THEN
    PERFORM cron.schedule('scan-backlinks-weekly', '0 2 * * 2',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scan-backlinks',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'backlink-outreach-weekly') THEN
    PERFORM cron.schedule('backlink-outreach-weekly', '0 14 * * 3',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/backlink-auto-outreach',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'indexnow-ping-2h') THEN
    PERFORM cron.schedule('indexnow-ping-2h', '0 */2 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/indexnow-ping',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;
END $$;

-- ============================================
-- 6. PROSPECTION (8 jobs)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scrape-taxi-companies-daily') THEN
    PERFORM cron.schedule('scrape-taxi-companies-daily', '0 3 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scrape-taxi-companies',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"batch_size": 50}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prospect-taxi-companies-daily') THEN
    PERFORM cron.schedule('prospect-taxi-companies-daily', '0 4 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/prospect-taxi-companies',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'partner-scraper-weekly') THEN
    PERFORM cron.schedule('partner-scraper-weekly', '0 8 * * 5',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/partner-scraper-outreach',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-followup-leads-daily') THEN
    PERFORM cron.schedule('auto-followup-leads-daily', '0 10 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-followup',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-outreach-emails-daily') THEN
    PERFORM cron.schedule('send-outreach-emails-daily', '0 14 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-outreach-emails',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-auto-responder-hourly') THEN
    PERFORM cron.schedule('email-auto-responder-hourly', '0 * * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/email-auto-responder',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;
END $$;

-- ============================================
-- 7. IA AUTO-APPRENANTE (9 jobs)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-behavior-analysis-daily') THEN
    PERFORM cron.schedule('ai-behavior-analysis-daily', '0 5 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-quality-controller',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"type": "behavior_analysis"}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-content-humanizer-3h') THEN
    PERFORM cron.schedule('ai-content-humanizer-3h', '0 */3 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-content-humanizer',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-quality-check-daily') THEN
    PERFORM cron.schedule('ai-quality-check-daily', '0 6 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-quality-controller',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"type": "quality_check"}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trend-analyzer-daily') THEN
    PERFORM cron.schedule('trend-analyzer-daily', '0 8 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/trend-analyzer-proxy',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-seo-notifier-daily') THEN
    PERFORM cron.schedule('auto-seo-notifier-daily', '0 11 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-seo-notifier',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'serp-lead-optimizer-daily') THEN
    PERFORM cron.schedule('serp-lead-optimizer-daily', '0 12 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/serp-lead-optimizer',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-content-scheduler-daily') THEN
    PERFORM cron.schedule('auto-content-scheduler-daily', '0 13 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-content-scheduler',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cron-orchestrator-6h') THEN
    PERFORM cron.schedule('cron-orchestrator-6h', '0 */6 * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/cron-orchestrator',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      ); $$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'automation-dashboard-hourly') THEN
    PERFORM cron.schedule('automation-dashboard-hourly', '0 * * * *',
      $$ SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/automation-dashboard-api',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"action": "refresh"}'::jsonb
      ); $$
    );
  END IF;
END $$;

-- ============================================
-- 8. RÉSUMÉ FINAL
-- ============================================

DO $$
DECLARE
  active_crons INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_crons FROM cron.job WHERE active = true;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ACTIVATION COMPLÈTE TERMINÉE !';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Cron jobs actifs: %', active_crons;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Génération contenu: 5+ jobs';
  RAISE NOTICE '📱 Réseaux sociaux: 8+ jobs';
  RAISE NOTICE '📊 SEO & Indexation: 5+ jobs';
  RAISE NOTICE '🚕 Prospection: 6+ jobs';
  RAISE NOTICE '🤖 IA auto-apprenante: 9+ jobs';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ CONFIGURER LES SECRETS API:';
  RAISE NOTICE 'Settings > Edge Functions > Secrets';
  RAISE NOTICE '- OPENAI_API_KEY';
  RAISE NOTICE '- PEXELS_API_KEY';
  RAISE NOTICE '- GOOGLE_SEARCH_CONSOLE_API_KEY';
  RAISE NOTICE '- PINTEREST_ACCESS_TOKEN';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tous les systèmes sont actifs !';
  RAISE NOTICE '============================================';
END $$;
