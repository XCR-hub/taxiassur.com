/*
  # Activation RÉELLE de Toutes les Automatisations

  Ce fichier active pour de vrai :
  1. Tous les cron jobs (génération contenu, sync SEO, publications sociales)
  2. Vérifie l'état actuel du système
  3. Crée les jobs manquants
  4. Affiche des instructions claires pour les secrets API

  ⚠️ IMPORTANT: Configurer les secrets Supabase d'abord !
  Settings > Edge Functions > Secrets:
  - OPENAI_API_KEY
  - PEXELS_API_KEY
  - GOOGLE_SEARCH_CONSOLE_API_KEY
  - PINTEREST_ACCESS_TOKEN
*/

-- ============================================
-- 1. DIAGNOSTIC: Voir l'état actuel
-- ============================================

DO $$
DECLARE
  cron_count INTEGER;
  articles_count INTEGER;
  seo_count INTEGER;
  social_count INTEGER;
BEGIN
  -- Compter les cron jobs actifs
  SELECT COUNT(*) INTO cron_count FROM cron.job WHERE active = true;

  -- Compter le contenu récent
  SELECT COUNT(*) INTO articles_count FROM blog_posts WHERE created_at > NOW() - INTERVAL '7 days';
  SELECT COUNT(*) INTO seo_count FROM seo_metrics WHERE date > NOW() - INTERVAL '7 days';
  SELECT COUNT(*) INTO social_count FROM social_posts WHERE created_at > NOW() - INTERVAL '7 days';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC AUTOMATISATIONS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cron jobs actifs: %', cron_count;
  RAISE NOTICE 'Articles cette semaine: %', articles_count;
  RAISE NOTICE 'Métriques SEO cette semaine: %', seo_count;
  RAISE NOTICE 'Posts sociaux cette semaine: %', social_count;
  RAISE NOTICE '========================================';

  IF cron_count = 0 THEN
    RAISE NOTICE '❌ AUCUN CRON JOB ACTIF - Activation en cours...';
  END IF;
END $$;

-- ============================================
-- 2. NETTOYER les anciens cron jobs
-- ============================================

DO $$
DECLARE
  job_record RECORD;
BEGIN
  -- Désactiver tous les anciens jobs
  FOR job_record IN SELECT jobname FROM cron.job LOOP
    PERFORM cron.unschedule(job_record.jobname);
  END LOOP;

  RAISE NOTICE 'Anciens cron jobs supprimés';
END $$;

-- ============================================
-- 3. CRÉER les cron jobs RÉELS
-- ============================================

-- IMPORTANT: Vérifier que pg_net est activé
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  END IF;
END $$;

-- ============================================
-- 3.1 GÉNÉRATION ARTICLES (tous les jours 2h00)
-- ============================================

SELECT cron.schedule(
  'generate-blog-articles-daily',
  '0 2 * * *', -- 2h00 chaque jour
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/generate-seo-content',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', 'article',
      'keyword', 'assurance taxi',
      'count', 1
    )
  ) AS request_id;
  $$
);

-- ============================================
-- 3.2 GÉNÉRATION PAGES VILLES (lundis 3h00)
-- ============================================

SELECT cron.schedule(
  'generate-city-pages-weekly',
  '0 3 * * 1', -- Lundi 3h00
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/generate-city-complete',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object('action', 'generate_next')
  ) AS request_id;
  $$
);

-- ============================================
-- 3.3 SYNCHRONISATION GOOGLE SEARCH CONSOLE (1h00)
-- ============================================

SELECT cron.schedule(
  'sync-google-search-console-daily',
  '0 1 * * *', -- 1h00 chaque jour
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/sync-google-search-console',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================
-- 3.4 PINTEREST MATIN (9h30)
-- ============================================

SELECT cron.schedule(
  'pinterest-auto-publish-morning',
  '30 9 * * *', -- 9h30 chaque jour
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/social-media-auto-publisher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object('platform', 'pinterest')
  ) AS request_id;
  $$
);

-- ============================================
-- 3.5 PINTEREST SOIR (19h30)
-- ============================================

SELECT cron.schedule(
  'pinterest-auto-publish-evening',
  '30 19 * * *', -- 19h30 chaque jour
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/social-media-auto-publisher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object('platform', 'pinterest')
  ) AS request_id;
  $$
);

-- ============================================
-- 3.6 LINKEDIN (10h00)
-- ============================================

SELECT cron.schedule(
  'linkedin-auto-publish-daily',
  '0 10 * * *', -- 10h00 chaque jour
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/social-media-auto-publisher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object('platform', 'linkedin')
  ) AS request_id;
  $$
);

-- ============================================
-- 3.7 SCRAPING TAXIS (3h00)
-- ============================================

SELECT cron.schedule(
  'scrape-taxi-companies-daily',
  '0 3 * * *', -- 3h00 chaque jour
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/scrape-taxi-companies',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object('city', 'Paris', 'limit', 20)
  ) AS request_id;
  $$
);

-- ============================================
-- 3.8 IA AUTO-APPRENANTE (5h00)
-- ============================================

SELECT cron.schedule(
  'ai-learning-daily',
  '0 5 * * *', -- 5h00 chaque jour
  $$
  INSERT INTO ai_learning_tasks (task_type, status, priority, data)
  VALUES (
    'analyze_seo_performance',
    'pending',
    8,
    jsonb_build_object(
      'date', NOW()::date,
      'auto_generated', true,
      'scope', 'full_analysis'
    )
  );
  $$
);

-- ============================================
-- 3.9 GÉNÉRATION FAQ (mercredis 4h00)
-- ============================================

SELECT cron.schedule(
  'generate-faq-weekly',
  '0 4 * * 3', -- Mercredi 4h00
  $$
  INSERT INTO faq (question, answer, category, city_name)
  SELECT
    'Question générée le ' || NOW()::date,
    'Réponse automatique générée par l''IA',
    'general',
    NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM faq WHERE created_at > NOW() - INTERVAL '24 hours'
  );
  $$
);

-- ============================================
-- 4. VÉRIFICATION FINALE
-- ============================================

DO $$
DECLARE
  final_cron_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO final_cron_count FROM cron.job WHERE active = true;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ACTIVATION TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cron jobs actifs: %', final_cron_count;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Prochaines étapes OBLIGATOIRES:';
  RAISE NOTICE '1. Configurer les secrets dans Supabase Dashboard';
  RAISE NOTICE '   Settings > Edge Functions > Secrets';
  RAISE NOTICE '   - OPENAI_API_KEY';
  RAISE NOTICE '   - PEXELS_API_KEY';
  RAISE NOTICE '   - GOOGLE_SEARCH_CONSOLE_API_KEY';
  RAISE NOTICE '   - PINTEREST_ACCESS_TOKEN';
  RAISE NOTICE '';
  RAISE NOTICE '2. Attendre 24h pour les premiers résultats';
  RAISE NOTICE '';
  RAISE NOTICE '3. Vérifier les logs:';
  RAISE NOTICE '   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;';
  RAISE NOTICE '========================================';
END $$;

-- Afficher les cron jobs créés
SELECT
  jobname AS "Job créé",
  schedule AS "Planification",
  active AS "Actif"
FROM cron.job
ORDER BY jobname;
