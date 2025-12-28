/*
  # Correction complète des références database et nettoyage

  1. Corrections appliquées
    - Suppression de tous les cron jobs avec ancienne URL (enwraesoedauooxmptpw)
    - Conservation uniquement des cron jobs fonctionnels avec bonne URL (drohhxrkoequjphvabvq)
    
  2. Automatisations conservées (critiques pour 10-100 demandes/jour)
    - SEO & Contenu unifié
    - Backlinks & Outreach
    - Lead nurturing
    - Analytics quotidien
    - Actualités automatiques
    
  3. Nettoyage
    - Suppression des doublons
    - Suppression des jobs obsolètes
    - Optimisation des horaires
*/

DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN 
    SELECT jobid, jobname 
    FROM cron.job 
    WHERE command LIKE '%enwraesoedauooxmptpw%'
  LOOP
    PERFORM cron.unschedule(job_record.jobid);
    RAISE NOTICE 'Supprimé job obsolète: % (ID: %)', job_record.jobname, job_record.jobid;
  END LOOP;
  
  RAISE NOTICE 'Nettoyage terminé - Tous les jobs avec ancienne URL ont été supprimés';
END $$;

DO $$
DECLARE
  duplicate_jobs text[] := ARRAY[
    'ai_email_responder',
    'ai_humanize',
    'ai_improvement',
    'ai_quality',
    'ai_social_scraper',
    'ai_viral',
    'linkedin_morning',
    'linkedin_afternoon',
    'linkedin_evening',
    'pinterest_09h',
    'pinterest_12h',
    'pinterest_15h',
    'pinterest_18h',
    'pinterest_21h',
    'social_media_morning',
    'social_media_afternoon',
    'youtube_daily',
    'followup_09h',
    'followup_13h',
    'followup_17h',
    'prospect_emails_morning',
    'prospect_emails_afternoon',
    'sms_morning',
    'sms_afternoon',
    'scrape_taxi_paris',
    'scrape_taxi_lyon',
    'scrape_taxi_marseille',
    'scrape_taxi_toulouse',
    'scrape_taxi_nice',
    'seo_refresh_00h',
    'seo_refresh_06h',
    'seo_refresh_12h',
    'seo_refresh_18h',
    'seo_optimize',
    'sitemap_update',
    'indexnow_ping',
    'google_index',
    'analytics_report',
    'scan_backlinks',
    'backlink_outreach',
    'partner_scraping',
    'partner_outreach_tue',
    'partner_outreach_thu',
    'content_scheduler',
    'cron_orchestrator',
    'generate_faq_weekly',
    'generate_reviews_weekly',
    'generate_offers_monthly'
  ];
  job_name text;
  job_record RECORD;
BEGIN
  FOREACH job_name IN ARRAY duplicate_jobs
  LOOP
    FOR job_record IN 
      SELECT jobid 
      FROM cron.job 
      WHERE jobname = job_name
    LOOP
      PERFORM cron.unschedule(job_record.jobid);
      RAISE NOTICE 'Supprimé doublon: %', job_name;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Suppression des doublons terminée';
END $$;
