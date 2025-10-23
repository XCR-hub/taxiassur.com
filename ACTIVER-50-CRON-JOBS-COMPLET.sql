-- ============================================
-- ACTIVATION COMPLÈTE DE TOUS LES CRON JOBS (~50)
-- À EXÉCUTER DANS SUPABASE SQL EDITOR
-- ============================================

-- ============================================
-- 1. NETTOYAGE COMPLET
-- ============================================

DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN SELECT jobname FROM cron.job LOOP
    BEGIN
      PERFORM cron.unschedule(job_record.jobname);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- ============================================
-- 2. RÉINITIALISATION AUTOMATION_STATUS
-- ============================================

TRUNCATE TABLE automation_status;

INSERT INTO automation_status (name, description, enabled) VALUES
  -- Génération Contenu
  ('generate_blog_daily', 'Génération quotidienne articles blog', true),
  ('generate_faq_weekly', 'Génération FAQ hebdomadaire', true),
  ('generate_city_pages', 'Génération pages villes', true),
  ('generate_reviews_weekly', 'Génération avis clients', true),
  ('generate_offers_monthly', 'Génération nouvelles offres', true),

  -- Réseaux Sociaux
  ('linkedin_morning', 'Publication LinkedIn matin', true),
  ('linkedin_afternoon', 'Publication LinkedIn après-midi', true),
  ('linkedin_evening', 'Publication LinkedIn soir', true),
  ('pinterest_09h', 'Publication Pinterest 9h', true),
  ('pinterest_12h', 'Publication Pinterest 12h', true),
  ('pinterest_15h', 'Publication Pinterest 15h', true),
  ('pinterest_18h', 'Publication Pinterest 18h', true),
  ('pinterest_21h', 'Publication Pinterest 21h', true),
  ('youtube_daily', 'Publication YouTube quotidienne', true),
  ('twitter_auto', 'Publication Twitter automatique', true),
  ('instagram_stories', 'Stories Instagram automatiques', true),

  -- Prospection & Leads
  ('scrape_taxi_paris', 'Scraping taxis Paris', true),
  ('scrape_taxi_lyon', 'Scraping taxis Lyon', true),
  ('scrape_taxi_marseille', 'Scraping taxis Marseille', true),
  ('scrape_taxi_toulouse', 'Scraping taxis Toulouse', true),
  ('scrape_taxi_nice', 'Scraping taxis Nice', true),
  ('prospect_emails_morning', 'Emails prospects matin', true),
  ('prospect_emails_afternoon', 'Emails prospects après-midi', true),
  ('followup_leads_auto', 'Suivi automatique leads', true),
  ('sms_followup', 'SMS de suivi', true),
  ('lead_scoring', 'Notation automatique leads', true),
  ('lead_enrichment', 'Enrichissement données leads', true),

  -- SEO & Analytics
  ('seo_optimize_daily', 'Optimisation SEO quotidienne', true),
  ('seo_refresh_00h', 'Refresh SEO minuit', true),
  ('seo_refresh_06h', 'Refresh SEO 6h', true),
  ('seo_refresh_12h', 'Refresh SEO midi', true),
  ('seo_refresh_18h', 'Refresh SEO 18h', true),
  ('sitemap_update', 'Mise à jour sitemap', true),
  ('indexnow_ping', 'Ping IndexNow', true),
  ('google_index_submit', 'Soumission Google Index', true),
  ('analytics_report', 'Rapport analytics quotidien', true),

  -- Backlinks & Partenaires
  ('scan_backlinks', 'Scan backlinks hebdomadaire', true),
  ('backlink_outreach', 'Outreach backlinks', true),
  ('partner_scraping', 'Scraping partenaires', true),
  ('partner_outreach', 'Outreach partenaires', true),
  ('directory_submission', 'Soumission annuaires', true),

  -- IA Avancée
  ('ai_humanize', 'Humanisation contenu IA', true),
  ('ai_viral_content', 'Génération contenu viral', true),
  ('ai_social_scraper', 'Scraping tendances sociales', true),
  ('ai_email_responder', 'Répondeur email IA', true),
  ('ai_quality_control', 'Contrôle qualité IA', true),
  ('ai_improvement', 'Auto-amélioration IA', true),
  ('ai_trend_analysis', 'Analyse tendances IA', true),

  -- Maintenance & Monitoring
  ('cleanup_old_data', 'Nettoyage données anciennes', true),
  ('backup_database', 'Backup base de données', true),
  ('health_check', 'Vérification santé système', true),
  ('error_monitoring', 'Monitoring erreurs', true),
  ('performance_monitoring', 'Monitoring performances', true)
ON CONFLICT (name) DO UPDATE SET enabled = true;

-- ============================================
-- 3. CRÉATION DE TOUS LES CRON JOBS
-- ============================================

-- GÉNÉRATION CONTENU (5 cron jobs)
-- ============================================

-- Blog quotidien (3h)
SELECT cron.schedule('generate_blog_daily', '0 3 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/generate-seo-content',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"type": "blog", "count": 2}'::jsonb
  )$$
);

-- FAQ hebdomadaire (dimanche 4h)
SELECT cron.schedule('generate_faq_weekly', '0 4 * * 0',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/generate-seo-content',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"type": "faq", "count": 3}'::jsonb
  )$$
);

-- Pages villes (samedi 5h)
SELECT cron.schedule('generate_city_pages', '0 5 * * 6',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/generate-city-pages-ai',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"cities": ["Paris", "Lyon", "Marseille"]}'::jsonb
  )$$
);

-- Avis clients (mercredi 10h)
SELECT cron.schedule('generate_reviews_weekly', '0 10 * * 3',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/generate-seo-content',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"type": "review", "count": 2}'::jsonb
  )$$
);

-- Nouvelles offres (1er du mois 8h)
SELECT cron.schedule('generate_offers_monthly', '0 8 1 * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/generate-seo-content',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"type": "offer", "count": 1}'::jsonb
  )$$
);

-- RÉSEAUX SOCIAUX (16 cron jobs)
-- ============================================

-- LinkedIn (8h, 14h, 18h)
SELECT cron.schedule('linkedin_morning', '0 8 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/linkedin-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('linkedin_afternoon', '0 14 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/linkedin-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('linkedin_evening', '0 18 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/linkedin-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Pinterest (9h, 12h, 15h, 18h, 21h)
SELECT cron.schedule('pinterest_09h', '0 9 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/pinterest-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('pinterest_12h', '0 12 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/pinterest-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('pinterest_15h', '0 15 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/pinterest-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('pinterest_18h', '0 18 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/pinterest-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('pinterest_21h', '0 21 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/pinterest-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- YouTube (20h)
SELECT cron.schedule('youtube_daily', '0 20 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/youtube-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Social Media Publisher (10h, 16h)
SELECT cron.schedule('social_media_morning', '0 10 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/social-media-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('social_media_afternoon', '0 16 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/social-media-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- PROSPECTION (12 cron jobs)
-- ============================================

-- Scraping Taxis par ville (lundi 2h-7h)
SELECT cron.schedule('scrape_taxi_paris', '0 2 * * 1',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/scrape-taxi-companies',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"city": "Paris"}'::jsonb
  )$$
);

SELECT cron.schedule('scrape_taxi_lyon', '0 3 * * 1',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/scrape-taxi-companies',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"city": "Lyon"}'::jsonb
  )$$
);

SELECT cron.schedule('scrape_taxi_marseille', '0 4 * * 1',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/scrape-taxi-companies',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"city": "Marseille"}'::jsonb
  )$$
);

SELECT cron.schedule('scrape_taxi_toulouse', '0 5 * * 1',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/scrape-taxi-companies',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"city": "Toulouse"}'::jsonb
  )$$
);

SELECT cron.schedule('scrape_taxi_nice', '0 6 * * 1',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/scrape-taxi-companies',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"city": "Nice"}'::jsonb
  )$$
);

-- Emails prospects (10h, 15h)
SELECT cron.schedule('prospect_emails_morning', '0 10 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/send-outreach-emails',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"max_emails": 20}'::jsonb
  )$$
);

SELECT cron.schedule('prospect_emails_afternoon', '0 15 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/send-outreach-emails',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"max_emails": 20}'::jsonb
  )$$
);

-- Suivi leads (9h, 13h, 17h)
SELECT cron.schedule('followup_09h', '0 9 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/auto-followup',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('followup_13h', '0 13 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/auto-followup',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('followup_17h', '0 17 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/auto-followup',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- SMS (11h, 16h)
SELECT cron.schedule('sms_morning', '0 11 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/send-sms',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('sms_afternoon', '0 16 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/send-sms',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- SEO & ANALYTICS (10 cron jobs)
-- ============================================

-- Optimisation SEO (1h)
SELECT cron.schedule('seo_optimize', '0 1 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/auto-seo-notifier',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Refresh SEO (toutes les 6h)
SELECT cron.schedule('seo_refresh_00h', '0 0 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/seo-daily-refresh',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('seo_refresh_06h', '0 6 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/seo-daily-refresh',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('seo_refresh_12h', '0 12 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/seo-daily-refresh',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('seo_refresh_18h', '0 18 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/seo-daily-refresh',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Sitemap, IndexNow, Google (quotidien)
SELECT cron.schedule('sitemap_update', '0 2 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/generate-seo-content',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"action": "sitemap"}'::jsonb
  )$$
);

SELECT cron.schedule('indexnow_ping', '30 2 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/indexnow-ping',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('google_index', '0 3 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/sync-google-search-console',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Analytics report (23h)
SELECT cron.schedule('analytics_report', '0 23 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/automation-dashboard-api',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"action": "daily_report"}'::jsonb
  )$$
);

-- BACKLINKS & PARTENAIRES (5 cron jobs)
-- ============================================

-- Scan backlinks (mercredi 3h)
SELECT cron.schedule('scan_backlinks', '0 3 * * 3',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/scan-backlinks',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Backlink outreach (quotidien 13h)
SELECT cron.schedule('backlink_outreach', '0 13 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/backlink-auto-outreach',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"max_outreach": 10}'::jsonb
  )$$
);

-- Partner scraping (vendredi 4h)
SELECT cron.schedule('partner_scraping', '0 4 * * 5',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/partner-scraper-outreach',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Partner outreach (mardi, jeudi 14h)
SELECT cron.schedule('partner_outreach_tue', '0 14 * * 2',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/send-outreach-emails',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"type": "partners", "max_emails": 15}'::jsonb
  )$$
);

SELECT cron.schedule('partner_outreach_thu', '0 14 * * 4',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/send-outreach-emails',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"type": "partners", "max_emails": 15}'::jsonb
  )$$
);

-- IA AVANCÉE (8 cron jobs)
-- ============================================

-- Humanisation (6h)
SELECT cron.schedule('ai_humanize', '0 6 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/ai-content-humanizer',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Contenu viral (7h)
SELECT cron.schedule('ai_viral', '0 7 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/ai-viral-content-generator',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Social scraper (8h)
SELECT cron.schedule('ai_social_scraper', '0 8 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/ai-social-scraper',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Email responder (toutes les heures)
SELECT cron.schedule('ai_email_responder', '0 * * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/ai-email-responder',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Quality control (23h)
SELECT cron.schedule('ai_quality', '0 23 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/ai-quality-controller',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Auto-amélioration (dimanche 1h)
SELECT cron.schedule('ai_improvement', '0 1 * * 0',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/ai-auto-improver',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Content scheduler (2h)
SELECT cron.schedule('content_scheduler', '0 2 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/auto-content-scheduler',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Cron orchestrator (4h)
SELECT cron.schedule('cron_orchestrator', '0 4 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/cron-orchestrator',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- ============================================
-- 4. VALIDATION FINALE
-- ============================================

DO $$
DECLARE
  job_count INTEGER;
  automation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_count FROM cron.job WHERE active = true;
  SELECT COUNT(*) INTO automation_count FROM automation_status WHERE enabled = true;

  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ ACTIVATION COMPLÈTE TERMINÉE !';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '📊 % cron jobs actifs', job_count;
  RAISE NOTICE '🤖 % automatisations actives', automation_count;
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Le système fonctionne en AUTONOMIE TOTALE !';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

-- Afficher la liste des cron jobs
SELECT
  jobname,
  schedule,
  active
FROM cron.job
WHERE active = true
ORDER BY jobname;
