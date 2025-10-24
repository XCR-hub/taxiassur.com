-- ============================================
-- RÉACTIVATION COMPLÈTE DE TOUTES LES AUTOMATISATIONS
-- À EXÉCUTER DANS SUPABASE SQL EDITOR
-- ============================================

-- ============================================
-- 1. NETTOYAGE CRON JOBS EXISTANTS
-- ============================================

DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN SELECT jobname FROM cron.job LOOP
    BEGIN
      PERFORM cron.unschedule(job_record.jobname);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ============================================
-- 2. RÉINITIALISATION AUTOMATION_STATUS
-- ============================================

TRUNCATE TABLE automation_status;

INSERT INTO automation_status (name, description, enabled) VALUES
  ('generate_blog_daily', 'Génération quotidienne articles blog avec IA', true),
  ('generate_faq_weekly', 'Génération hebdomadaire FAQ avec IA', true),
  ('generate_city_pages', 'Génération automatique pages villes', true),
  ('publish_linkedin_3x', 'Publication LinkedIn 3x par jour', true),
  ('publish_pinterest_5x', 'Publication Pinterest 5x par jour', true),
  ('publish_youtube_daily', 'Publication YouTube quotidienne', true),
  ('scrape_taxi_companies', 'Scraping compagnies taxis hebdomadaire', true),
  ('send_prospect_emails', 'Envoi emails prospects quotidien', true),
  ('send_followup_sms', 'Envoi SMS de suivi automatique', true),
  ('optimize_seo_daily', 'Optimisation SEO quotidienne', true),
  ('refresh_seo_metrics', 'Refresh métriques SEO Google', true),
  ('scan_backlinks_weekly', 'Scan backlinks hebdomadaire', true),
  ('auto_outreach_daily', 'Outreach automatique partenaires', true),
  ('humanize_content_ai', 'Humanisation contenu IA', true),
  ('viral_content_generator', 'Générateur contenu viral', true),
  ('social_media_scraper', 'Scraping tendances réseaux sociaux', true),
  ('auto_email_responder', 'Répondeur email automatique', true),
  ('quality_control_ai', 'Contrôle qualité IA', true),
  ('auto_improvement_ai', 'Auto-amélioration système IA', true),
  ('content_scheduler', 'Planificateur contenu automatique', true)
ON CONFLICT (name) DO UPDATE SET enabled = true;

-- ============================================
-- 3. CRÉATION TOUS LES CRON JOBS
-- ============================================

-- Génération Blog (3h)
SELECT cron.schedule('generate_blog_daily', '0 3 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/generate-seo-content',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"type": "blog", "count": 2}'::jsonb
  )$$
);

-- Génération FAQ (dimanche 4h)
SELECT cron.schedule('generate_faq_weekly', '0 4 * * 0',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/generate-seo-content',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"type": "faq", "count": 3}'::jsonb
  )$$
);

-- Publication LinkedIn (8h, 14h, 18h)
SELECT cron.schedule('publish_linkedin_morning', '0 8 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/linkedin-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('publish_linkedin_afternoon', '0 14 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/linkedin-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('publish_linkedin_evening', '0 18 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/linkedin-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Publication Pinterest (9h, 12h, 15h, 18h, 21h)
SELECT cron.schedule('publish_pinterest_09h', '0 9 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/pinterest-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('publish_pinterest_12h', '0 12 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/pinterest-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('publish_pinterest_15h', '0 15 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/pinterest-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('publish_pinterest_18h', '0 18 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/pinterest-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('publish_pinterest_21h', '0 21 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/pinterest-publisher',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Scraping Taxis (lundi 2h)
SELECT cron.schedule('scrape_taxi_companies', '0 2 * * 1',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/scrape-taxi-companies',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"cities": ["Paris", "Lyon", "Marseille"]}'::jsonb
  )$$
);

-- Envoi Emails Prospects (10h)
SELECT cron.schedule('send_prospect_emails', '0 10 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/send-outreach-emails',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"max_emails": 20}'::jsonb
  )$$
);

-- Auto-followup (9h)
SELECT cron.schedule('auto_followup', '0 9 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/auto-followup',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Optimisation SEO (1h)
SELECT cron.schedule('optimize_seo_daily', '0 1 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/auto-seo-notifier',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Refresh SEO (0h et 6h)
SELECT cron.schedule('refresh_seo_00h', '0 0 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/seo-daily-refresh',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

SELECT cron.schedule('refresh_seo_06h', '0 6 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/seo-daily-refresh',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Scan Backlinks (mercredi 3h)
SELECT cron.schedule('scan_backlinks', '0 3 * * 3',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/scan-backlinks',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Auto Outreach (13h)
SELECT cron.schedule('auto_outreach', '0 13 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/backlink-auto-outreach',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII", "Content-Type": "application/json"}'::jsonb,
    body:='{"max_outreach": 10}'::jsonb
  )$$
);

-- Humanisation IA (6h)
SELECT cron.schedule('humanize_content', '0 6 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/ai-content-humanizer',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Contenu Viral (7h)
SELECT cron.schedule('viral_content', '0 7 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/ai-viral-content-generator',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Répondeur Email (toutes les heures)
SELECT cron.schedule('email_responder', '0 * * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/ai-email-responder',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- Contrôle Qualité (23h)
SELECT cron.schedule('quality_control', '0 23 * * *',
  $$SELECT net.http_post(
    url:='https://enwraesoedauooxmptpw.supabase.co/functions/v1/ai-quality-controller',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud3JhZXNvZWRhdW9veG1wdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxNzUwNjksImV4cCI6MjA0NTc1MTA2OX0.RG8bILWg6V-rnPCQ7U5L05KQy49l4B3oA_N_mjzGWII"}'::jsonb
  )$$
);

-- ============================================
-- 4. VÉRIFICATION
-- ============================================

-- Compter les automatisations
SELECT
  'CRON JOBS ACTIFS' as type,
  COUNT(*) as total
FROM cron.job
WHERE active = true
UNION ALL
SELECT
  'AUTOMATISATIONS ACTIVES',
  COUNT(*)
FROM automation_status
WHERE enabled = true;

-- Lister toutes les automatisations
SELECT
  name,
  description,
  enabled
FROM automation_status
ORDER BY name;
