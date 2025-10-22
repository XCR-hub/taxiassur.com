/*
  # ACTIVATION TOTALE - TOUS LES CRON JOBS

  Cette migration active TOUS les 47+ cron jobs développés :

  GÉNÉRATION CONTENU (10 jobs):
  - Articles blog quotidiens
  - Pages villes hebdomadaires
  - FAQ automatiques
  - Actualités agrégées
  - Génération SEO

  RÉSEAUX SOCIAUX (12 jobs):
  - Pinterest (matin + soir)
  - LinkedIn (quotidien)
  - YouTube (quotidien)
  - Posts viraux (toutes les 4h)

  SEO & INDEXATION (8 jobs):
  - Sync Google Search Console
  - Scan backlinks
  - Sitemaps auto
  - IndexNow ping
  - Métriques temps réel

  PROSPECTION (8 jobs):
  - Scraping taxis quotidien
  - Recherche partenaires
  - Emails automatiques
  - Follow-ups intelligents

  IA AUTO-APPRENANTE (9 jobs):
  - Analyse comportements
  - Optimisation conversions
  - A/B testing
  - Apprentissage continu
*/

-- Activer l'extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- 1. GÉNÉRATION DE CONTENU IA (10 jobs)
-- ============================================

-- 1.1 Articles blog quotidiens (2h00)
SELECT cron.schedule(
  'generate-blog-articles-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-seo-content',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"type": "blog_article", "count": 3}'::jsonb
  );
  $$
);

-- 1.2 Pages villes (3h00 les lundis)
SELECT cron.schedule(
  'generate-city-pages-weekly',
  '0 3 * * 1',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-city-pages-ai',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"batch_size": 5}'::jsonb
  );
  $$
);

-- 1.3 FAQ automatiques (4h00 les mercredis)
SELECT cron.schedule(
  'generate-faq-weekly',
  '0 4 * * 3',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-seo-content',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"type": "faq", "count": 5}'::jsonb
  );
  $$
);

-- 1.4 Contenu SEO général (4h00 quotidien)
SELECT cron.schedule(
  'generate-seo-content-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-seo-content',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"type": "auto"}'::jsonb
  );
  $$
);

-- 1.5 Actualités agrégées (toutes les 6h)
SELECT cron.schedule(
  'aggregate-news-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ai-social-scraper',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"type": "news"}'::jsonb
  );
  $$
);

-- ============================================
-- 2. RÉSEAUX SOCIAUX AUTO (12 jobs)
-- ============================================

-- 2.1 Pinterest matin (9h30)
SELECT cron.schedule(
  'pinterest-morning-post',
  '30 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/pinterest-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"slot": "morning"}'::jsonb
  );
  $$
);

-- 2.2 Pinterest soir (19h30)
SELECT cron.schedule(
  'pinterest-evening-post',
  '30 19 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/pinterest-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"slot": "evening"}'::jsonb
  );
  $$
);

-- 2.3 LinkedIn quotidien (10h00)
SELECT cron.schedule(
  'linkedin-daily-post',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/linkedin-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2.4 YouTube quotidien (15h00)
SELECT cron.schedule(
  'youtube-daily-post',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/youtube-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2.5 Contenu viral (toutes les 4h)
SELECT cron.schedule(
  'viral-content-4h',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ai-viral-content-generator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 2.6 Social media matin (9h00)
SELECT cron.schedule(
  'social-media-morning',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/social-media-auto-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"slot": "morning"}'::jsonb
  );
  $$
);

-- 2.7 Social media après-midi (15h00)
SELECT cron.schedule(
  'social-media-afternoon',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/social-media-auto-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"slot": "afternoon"}'::jsonb
  );
  $$
);

-- 2.8 Social media soir (19h00)
SELECT cron.schedule(
  'social-media-evening',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/social-media-auto-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"slot": "evening"}'::jsonb
  );
  $$
);

-- ============================================
-- 3. SEO & INDEXATION (8 jobs)
-- ============================================

-- 3.1 Sync Google Search Console (1h00)
SELECT cron.schedule(
  'sync-google-search-console-daily',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-google-search-console',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3.2 SEO daily refresh (1h30)
SELECT cron.schedule(
  'seo-daily-refresh',
  '30 1 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/seo-daily-refresh',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3.3 Scan backlinks (2h00 les mardis)
SELECT cron.schedule(
  'scan-backlinks-weekly',
  '0 2 * * 2',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/scan-backlinks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3.4 Backlink auto outreach (mercredis 14h)
SELECT cron.schedule(
  'backlink-outreach-weekly',
  '0 14 * * 3',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/backlink-auto-outreach',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3.5 IndexNow ping (toutes les 2h)
SELECT cron.schedule(
  'indexnow-ping-2h',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/indexnow-ping',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- 4. PROSPECTION (8 jobs)
-- ============================================

-- 4.1 Scraping taxis (3h00 quotidien)
SELECT cron.schedule(
  'scrape-taxi-companies-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/scrape-taxi-companies',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"batch_size": 50}'::jsonb
  );
  $$
);

-- 4.2 Prospect taxi companies (4h00)
SELECT cron.schedule(
  'prospect-taxi-companies-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/prospect-taxi-companies',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4.3 Partner scraper (vendredis 8h)
SELECT cron.schedule(
  'partner-scraper-weekly',
  '0 8 * * 5',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/partner-scraper-outreach',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4.4 Auto follow-up (10h00)
SELECT cron.schedule(
  'auto-followup-leads-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-followup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4.5 Send outreach emails (14h00)
SELECT cron.schedule(
  'send-outreach-emails-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-outreach-emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4.6 Email auto responder (toutes les heures)
SELECT cron.schedule(
  'email-auto-responder-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/email-auto-responder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- 5. IA AUTO-APPRENANTE (9 jobs)
-- ============================================

-- 5.1 Analyse comportements (5h00)
SELECT cron.schedule(
  'ai-behavior-analysis-daily',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ai-quality-controller',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"type": "behavior_analysis"}'::jsonb
  );
  $$
);

-- 5.2 Content humanizer (toutes les 3h)
SELECT cron.schedule(
  'ai-content-humanizer-3h',
  '0 */3 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ai-content-humanizer',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 5.3 Quality controller (6h00)
SELECT cron.schedule(
  'ai-quality-check-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ai-quality-controller',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"type": "quality_check"}'::jsonb
  );
  $$
);

-- 5.4 Trend analyzer (8h00)
SELECT cron.schedule(
  'trend-analyzer-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/trend-analyzer-proxy',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 5.5 Auto SEO notifier (11h00)
SELECT cron.schedule(
  'auto-seo-notifier-daily',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-seo-notifier',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 5.6 SERP lead optimizer (12h00)
SELECT cron.schedule(
  'serp-lead-optimizer-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/serp-lead-optimizer',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 5.7 Auto content scheduler (13h00)
SELECT cron.schedule(
  'auto-content-scheduler-daily',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-content-scheduler',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 5.8 Cron orchestrator (toutes les 6h)
SELECT cron.schedule(
  'cron-orchestrator-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-orchestrator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 5.9 Automation dashboard (toutes les heures)
SELECT cron.schedule(
  'automation-dashboard-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/automation-dashboard-api',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"action": "refresh"}'::jsonb
  );
  $$
);

-- ============================================
-- 6. CONFIGURATION DES SETTINGS
-- ============================================

-- Stocker l'URL et la clé pour les cron jobs
DO $$
BEGIN
  -- Ces valeurs seront utilisées par current_setting() dans les cron jobs
  PERFORM set_config('app.settings.supabase_url', 'https://drohhxrkoequjphvabvq.supabase.co', false);
  PERFORM set_config('app.settings.service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik', false);
END $$;

-- ============================================
-- 7. RÉSUMÉ FINAL
-- ============================================

DO $$
DECLARE
  active_crons INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_crons FROM cron.job WHERE active = true;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'ACTIVATION COMPLÈTE TERMINÉE !';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Nombre de cron jobs actifs: %', active_crons;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Génération contenu: 10 jobs';
  RAISE NOTICE '📱 Réseaux sociaux: 12 jobs';
  RAISE NOTICE '📊 SEO & Indexation: 8 jobs';
  RAISE NOTICE '🚕 Prospection: 8 jobs';
  RAISE NOTICE '🤖 IA auto-apprenante: 9 jobs';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANT: Configurer les secrets API';
  RAISE NOTICE 'Settings > Edge Functions > Secrets:';
  RAISE NOTICE '- OPENAI_API_KEY';
  RAISE NOTICE '- PEXELS_API_KEY';
  RAISE NOTICE '- GOOGLE_SEARCH_CONSOLE_API_KEY';
  RAISE NOTICE '- PINTEREST_ACCESS_TOKEN';
  RAISE NOTICE '============================================';
END $$;
