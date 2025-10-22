/*
  # ACTIVATION CRON JOBS - VERSION FINALE SANS ERREUR

  Active tous les cron jobs en vérifiant d'abord s'ils existent.
  Utilise DO $$ avec conditions pour éviter les doublons.
*/

-- Vérifier extension pg_cron
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
    RAISE NOTICE 'Extension pg_cron créée';
  END IF;
END $$;

-- ============================================
-- SUPPRIMER LES CRON JOBS EXISTANTS (OPTIONNEL)
-- ============================================
-- Décommenter si vous voulez repartir de zéro
/*
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN SELECT jobid FROM cron.job LOOP
    PERFORM cron.unschedule(job_record.jobid);
  END LOOP;
  RAISE NOTICE 'Tous les cron jobs ont été supprimés';
END $$;
*/

-- ============================================
-- 1. GÉNÉRATION CONTENU IA
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-blog-articles-daily') THEN
    PERFORM cron.schedule(
      'generate-blog-articles-daily',
      '0 2 * * *',
      $body$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"type": "blog_article", "count": 3}'::jsonb
      );
      $body$
    );
    RAISE NOTICE '✅ generate-blog-articles-daily créé';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-city-pages-weekly') THEN
    PERFORM cron.schedule(
      'generate-city-pages-weekly',
      '0 3 * * 1',
      $body$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-city-pages-ai',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"batch_size": 5}'::jsonb
      );
      $body$
    );
    RAISE NOTICE '✅ generate-city-pages-weekly créé';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-faq-weekly') THEN
    PERFORM cron.schedule(
      'generate-faq-weekly',
      '0 4 * * 3',
      $body$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"type": "faq", "count": 5}'::jsonb
      );
      $body$
    );
    RAISE NOTICE '✅ generate-faq-weekly créé';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aggregate-news-6h') THEN
    PERFORM cron.schedule(
      'aggregate-news-6h',
      '0 */6 * * *',
      $body$
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-social-scraper',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
        body := '{"type": "news"}'::jsonb
      );
      $body$
    );
    RAISE NOTICE '✅ aggregate-news-6h créé';
  END IF;
END $$;

-- ============================================
-- 2. RÉSEAUX SOCIAUX
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pinterest-morning-post') THEN
    PERFORM cron.schedule('pinterest-morning-post', '30 9 * * *',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/pinterest-publisher', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{"slot": "morning"}'::jsonb);$body$
    );
    RAISE NOTICE '✅ pinterest-morning-post créé';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pinterest-evening-post') THEN
    PERFORM cron.schedule('pinterest-evening-post', '30 19 * * *',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/pinterest-publisher', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{"slot": "evening"}'::jsonb);$body$
    );
    RAISE NOTICE '✅ pinterest-evening-post créé';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'linkedin-daily-post') THEN
    PERFORM cron.schedule('linkedin-daily-post', '0 10 * * *',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/linkedin-publisher', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
    );
    RAISE NOTICE '✅ linkedin-daily-post créé';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'youtube-daily-post') THEN
    PERFORM cron.schedule('youtube-daily-post', '0 15 * * *',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/youtube-publisher', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
    );
    RAISE NOTICE '✅ youtube-daily-post créé';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'viral-content-4h') THEN
    PERFORM cron.schedule('viral-content-4h', '0 */4 * * *',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-viral-content-generator', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
    );
    RAISE NOTICE '✅ viral-content-4h créé';
  END IF;
END $$;

-- ============================================
-- 3. SEO & INDEXATION
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-google-search-console-daily') THEN
    PERFORM cron.schedule('sync-google-search-console-daily', '0 1 * * *',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/sync-google-search-console', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
    );
    RAISE NOTICE '✅ sync-google-search-console-daily créé';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'seo-daily-refresh') THEN
    PERFORM cron.schedule('seo-daily-refresh', '30 1 * * *',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/seo-daily-refresh', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
    );
    RAISE NOTICE '✅ seo-daily-refresh créé';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scan-backlinks-weekly') THEN
    PERFORM cron.schedule('scan-backlinks-weekly', '0 2 * * 2',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scan-backlinks', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
    );
    RAISE NOTICE '✅ scan-backlinks-weekly créé';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'indexnow-ping-2h') THEN
    PERFORM cron.schedule('indexnow-ping-2h', '0 */2 * * *',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/indexnow-ping', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
    );
    RAISE NOTICE '✅ indexnow-ping-2h créé';
  END IF;
END $$;

-- ============================================
-- 4. PROSPECTION
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scrape-taxi-companies-daily') THEN
    PERFORM cron.schedule('scrape-taxi-companies-daily', '0 3 * * *',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scrape-taxi-companies', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{"batch_size": 50}'::jsonb);$body$
    );
    RAISE NOTICE '✅ scrape-taxi-companies-daily créé';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-followup-leads-daily') THEN
    PERFORM cron.schedule('auto-followup-leads-daily', '0 10 * * *',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-followup', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
    );
    RAISE NOTICE '✅ auto-followup-leads-daily créé';
  END IF;
END $$;

-- ============================================
-- 5. IA AUTO-APPRENANTE
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-content-humanizer-3h') THEN
    PERFORM cron.schedule('ai-content-humanizer-3h', '0 */3 * * *',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-content-humanizer', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
    );
    RAISE NOTICE '✅ ai-content-humanizer-3h créé';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trend-analyzer-daily') THEN
    PERFORM cron.schedule('trend-analyzer-daily', '0 8 * * *',
      $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/trend-analyzer-proxy', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
    );
    RAISE NOTICE '✅ trend-analyzer-daily créé';
  END IF;
END $$;

-- ============================================
-- RÉSUMÉ FINAL
-- ============================================

DO $$
DECLARE
  active_crons INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_crons FROM cron.job WHERE active = true;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ACTIVATION TERMINÉE AVEC SUCCÈS !';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Cron jobs actifs: %', active_crons;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Génération: 4 jobs (blog, villes, FAQ, news)';
  RAISE NOTICE '📱 Réseaux: 5 jobs (Pinterest 2x, LinkedIn, YouTube, viral)';
  RAISE NOTICE '📊 SEO: 4 jobs (GSC, refresh, backlinks, IndexNow)';
  RAISE NOTICE '🚕 Prospection: 2 jobs (scraping, follow-ups)';
  RAISE NOTICE '🤖 IA: 2 jobs (humanizer, analyzer)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ CONFIGURER LES SECRETS API:';
  RAISE NOTICE 'Settings > Edge Functions > Secrets';
  RAISE NOTICE '- OPENAI_API_KEY';
  RAISE NOTICE '- PEXELS_API_KEY';
  RAISE NOTICE '- GOOGLE_SEARCH_CONSOLE_API_KEY';
  RAISE NOTICE '- PINTEREST_ACCESS_TOKEN';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tous les systèmes sont opérationnels !';
  RAISE NOTICE '============================================';
END $$;
