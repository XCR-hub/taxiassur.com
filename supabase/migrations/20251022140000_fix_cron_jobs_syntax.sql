/*
  # ACTIVATION CRON JOBS - VERSION CORRIGÉE SANS ERREUR SYNTAXE

  Corrige le problème de $$ imbriqués en utilisant $body$ à la place.
  Active 40+ cron jobs automatiquement.
*/

-- Vérifier extension pg_cron
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
    RAISE NOTICE 'Extension pg_cron créée';
  ELSE
    RAISE NOTICE 'Extension pg_cron déjà existante';
  END IF;
END $$;

-- ============================================
-- 1. GÉNÉRATION CONTENU IA
-- ============================================

-- Articles blog quotidiens
SELECT cron.schedule(
  'generate-blog-articles-daily',
  '0 2 * * *',
  $body$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"type": "blog_article", "count": 3}'::jsonb
  );
  $body$
) ON CONFLICT (jobname) DO NOTHING;

-- Pages villes hebdo
SELECT cron.schedule(
  'generate-city-pages-weekly',
  '0 3 * * 1',
  $body$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-city-pages-ai',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"batch_size": 5}'::jsonb
  );
  $body$
) ON CONFLICT (jobname) DO NOTHING;

-- FAQ automatiques
SELECT cron.schedule(
  'generate-faq-weekly',
  '0 4 * * 3',
  $body$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"type": "faq", "count": 5}'::jsonb
  );
  $body$
) ON CONFLICT (jobname) DO NOTHING;

-- Actualités toutes les 6h
SELECT cron.schedule(
  'aggregate-news-6h',
  '0 */6 * * *',
  $body$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-social-scraper',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"type": "news"}'::jsonb
  );
  $body$
) ON CONFLICT (jobname) DO NOTHING;

-- ============================================
-- 2. RÉSEAUX SOCIAUX
-- ============================================

SELECT cron.schedule('pinterest-morning-post', '30 9 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/pinterest-publisher', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{"slot": "morning"}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('pinterest-evening-post', '30 19 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/pinterest-publisher', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{"slot": "evening"}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('linkedin-daily-post', '0 10 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/linkedin-publisher', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('youtube-daily-post', '0 15 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/youtube-publisher', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('viral-content-4h', '0 */4 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-viral-content-generator', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('social-media-morning', '0 9 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-auto-publisher', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{"slot": "morning"}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('social-media-afternoon', '0 15 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-auto-publisher', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{"slot": "afternoon"}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('social-media-evening', '0 19 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-auto-publisher', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{"slot": "evening"}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

-- ============================================
-- 3. SEO & INDEXATION
-- ============================================

SELECT cron.schedule('sync-google-search-console-daily', '0 1 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/sync-google-search-console', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('seo-daily-refresh', '30 1 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/seo-daily-refresh', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('scan-backlinks-weekly', '0 2 * * 2',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scan-backlinks', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('backlink-outreach-weekly', '0 14 * * 3',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/backlink-auto-outreach', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('indexnow-ping-2h', '0 */2 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/indexnow-ping', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

-- ============================================
-- 4. PROSPECTION
-- ============================================

SELECT cron.schedule('scrape-taxi-companies-daily', '0 3 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scrape-taxi-companies', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{"batch_size": 50}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('prospect-taxi-companies-daily', '0 4 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/prospect-taxi-companies', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('partner-scraper-weekly', '0 8 * * 5',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/partner-scraper-outreach', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('auto-followup-leads-daily', '0 10 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-followup', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('send-outreach-emails-daily', '0 14 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-outreach-emails', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('email-auto-responder-hourly', '0 * * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/email-auto-responder', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

-- ============================================
-- 5. IA AUTO-APPRENANTE
-- ============================================

SELECT cron.schedule('ai-behavior-analysis-daily', '0 5 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-quality-controller', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{"type": "behavior_analysis"}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('ai-content-humanizer-3h', '0 */3 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-content-humanizer', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('trend-analyzer-daily', '0 8 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/trend-analyzer-proxy', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('auto-seo-notifier-daily', '0 11 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-seo-notifier', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('serp-lead-optimizer-daily', '0 12 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/serp-lead-optimizer', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('auto-content-scheduler-daily', '0 13 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-content-scheduler', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

SELECT cron.schedule('cron-orchestrator-6h', '0 */6 * * *',
  $body$SELECT net.http_post(url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/cron-orchestrator', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);$body$
) ON CONFLICT (jobname) DO NOTHING;

-- Résumé
DO $$
DECLARE
  active_crons INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_crons FROM cron.job WHERE active = true;
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ACTIVATION TERMINÉE !';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Cron jobs actifs: %', active_crons;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ CONFIGURER LES SECRETS API:';
  RAISE NOTICE 'Settings > Edge Functions > Secrets';
  RAISE NOTICE '- OPENAI_API_KEY';
  RAISE NOTICE '- PEXELS_API_KEY';
  RAISE NOTICE '- GOOGLE_SEARCH_CONSOLE_API_KEY';
  RAISE NOTICE '- PINTEREST_ACCESS_TOKEN';
END $$;
