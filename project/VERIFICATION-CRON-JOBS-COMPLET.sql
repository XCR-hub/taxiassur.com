/*
  # VÉRIFICATION COMPLÈTE CRON JOBS

  Script pour lister et vérifier tous les cron jobs actifs
  dans Supabase pg_cron
*/

-- ============================================
-- 1. LISTE TOUS LES CRON JOBS
-- ============================================

SELECT
  jobid,
  jobname,
  schedule,
  command,
  active,
  CASE
    WHEN active THEN ' Actif'
    ELSE 'L Inactif'
  END as status
FROM cron.job
ORDER BY active DESC, jobname;

-- ============================================
-- 2. RÉSUMÉ PAR STATUT
-- ============================================

SELECT
  CASE
    WHEN active THEN ' Actif'
    ELSE 'L Inactif'
  END as status,
  COUNT(*) as total
FROM cron.job
GROUP BY active
ORDER BY active DESC;

-- ============================================
-- 3. CRON JOBS PAR CATÉGORIE
-- ============================================

SELECT
  CASE
    WHEN jobname ILIKE '%blog%' OR command ILIKE '%blog%' THEN '=Ý Blog'
    WHEN jobname ILIKE '%faq%' THEN 'S FAQ'
    WHEN jobname ILIKE '%news%' OR jobname ILIKE '%actualit%' THEN '=ð News'
    WHEN jobname ILIKE '%social%' OR jobname ILIKE '%linkedin%' OR jobname ILIKE '%pinterest%' OR jobname ILIKE '%youtube%' THEN '=ñ Réseaux Sociaux'
    WHEN jobname ILIKE '%seo%' OR jobname ILIKE '%search%' OR jobname ILIKE '%google%' THEN '= SEO'
    WHEN jobname ILIKE '%email%' OR jobname ILIKE '%lead%' THEN '=ç Email/Leads'
    WHEN jobname ILIKE '%city%' OR jobname ILIKE '%ville%' THEN '<Ù Villes'
    WHEN jobname ILIKE '%backlink%' THEN '= Backlinks'
    ELSE '=' Autre'
  END as categorie,
  jobname,
  schedule,
  active
FROM cron.job
ORDER BY
  CASE
    WHEN jobname ILIKE '%blog%' OR command ILIKE '%blog%' THEN 1
    WHEN jobname ILIKE '%faq%' THEN 2
    WHEN jobname ILIKE '%news%' OR jobname ILIKE '%actualit%' THEN 3
    WHEN jobname ILIKE '%social%' OR jobname ILIKE '%linkedin%' OR jobname ILIKE '%pinterest%' OR jobname ILIKE '%youtube%' THEN 4
    WHEN jobname ILIKE '%seo%' OR jobname ILIKE '%search%' OR jobname ILIKE '%google%' THEN 5
    WHEN jobname ILIKE '%email%' OR jobname ILIKE '%lead%' THEN 6
    WHEN jobname ILIKE '%city%' OR jobname ILIKE '%ville%' THEN 7
    WHEN jobname ILIKE '%backlink%' THEN 8
    ELSE 9
  END,
  active DESC;

-- ============================================
-- 4. HISTORIQUE D'EXÉCUTION (Si disponible)
-- ============================================

-- Note: pg_cron ne garde pas l'historique par défaut
-- Pour voir les logs, utiliser:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = [ID]
-- ORDER BY start_time DESC
-- LIMIT 10;

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '=¡ COMMANDES UTILES';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Voir historique exécution d''un job:';
  RAISE NOTICE '  SELECT * FROM cron.job_run_details';
  RAISE NOTICE '  WHERE jobid = [ID]';
  RAISE NOTICE '  ORDER BY start_time DESC LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE 'Activer un cron job:';
  RAISE NOTICE '  UPDATE cron.job SET active = true';
  RAISE NOTICE '  WHERE jobid = [ID];';
  RAISE NOTICE '';
  RAISE NOTICE 'Désactiver un cron job:';
  RAISE NOTICE '  UPDATE cron.job SET active = false';
  RAISE NOTICE '  WHERE jobid = [ID];';
  RAISE NOTICE '';
  RAISE NOTICE 'Supprimer un cron job:';
  RAISE NOTICE '  SELECT cron.unschedule([ID]);';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 5. ANALYSE DÉTAILLÉE
-- ============================================

DO $$
DECLARE
  total_jobs INTEGER;
  active_jobs INTEGER;
  inactive_jobs INTEGER;
  cron_rec RECORD;
  blog_count INTEGER := 0;
  faq_count INTEGER := 0;
  social_count INTEGER := 0;
  seo_count INTEGER := 0;
  email_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '=Ê ANALYSE DÉTAILLÉE CRON JOBS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- Compter total
  SELECT COUNT(*) INTO total_jobs FROM cron.job;
  SELECT COUNT(*) INTO active_jobs FROM cron.job WHERE active = true;
  SELECT COUNT(*) INTO inactive_jobs FROM cron.job WHERE active = false;

  RAISE NOTICE 'Total cron jobs: %', total_jobs;
  RAISE NOTICE '   Actifs: %', active_jobs;
  RAISE NOTICE '  L Inactifs: %', inactive_jobs;
  RAISE NOTICE '';

  -- Analyser par catégorie
  FOR cron_rec IN
    SELECT
      jobid,
      jobname,
      schedule,
      active,
      command
    FROM cron.job
    ORDER BY jobname
  LOOP
    IF cron_rec.jobname ILIKE '%blog%' OR cron_rec.command ILIKE '%blog%' THEN
      blog_count := blog_count + 1;
    ELSIF cron_rec.jobname ILIKE '%faq%' THEN
      faq_count := faq_count + 1;
    ELSIF cron_rec.jobname ILIKE '%social%' OR cron_rec.jobname ILIKE '%linkedin%' OR cron_rec.jobname ILIKE '%pinterest%' THEN
      social_count := social_count + 1;
    ELSIF cron_rec.jobname ILIKE '%seo%' OR cron_rec.jobname ILIKE '%google%' THEN
      seo_count := seo_count + 1;
    ELSIF cron_rec.jobname ILIKE '%email%' OR cron_rec.jobname ILIKE '%lead%' THEN
      email_count := email_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '=Ê PAR CATÉGORIE:';
  RAISE NOTICE '  =Ý Blog: %', blog_count;
  RAISE NOTICE '  S FAQ: %', faq_count;
  RAISE NOTICE '  =ñ Réseaux sociaux: %', social_count;
  RAISE NOTICE '  = SEO: %', seo_count;
  RAISE NOTICE '  =ç Email/Leads: %', email_count;
  RAISE NOTICE '';

  -- Recommandations
  RAISE NOTICE '=¡ RECOMMANDATIONS:';
  IF active_jobs = 0 THEN
    RAISE NOTICE '    AUCUN CRON JOB ACTIF! Activer les automatisations.';
  ELSIF active_jobs < 5 THEN
    RAISE NOTICE '    Peu de cron jobs actifs. Vérifier configuration.';
  ELSIF active_jobs >= 10 THEN
    RAISE NOTICE '   Bon nombre de cron jobs actifs!';
  END IF;

  IF blog_count = 0 THEN
    RAISE NOTICE '    Aucun cron job pour le blog';
  END IF;

  IF social_count = 0 THEN
    RAISE NOTICE '    Aucun cron job réseaux sociaux';
  END IF;

  IF seo_count = 0 THEN
    RAISE NOTICE '    Aucun cron job SEO';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;
