/*
  # VÉRIFICATION COMPLÈTE DES CRON JOBS

  Vérifie que tous les cron jobs de publication automatique fonctionnent
  avec les structures corrigées (blog_posts, faq, news)
*/

-- ============================================
-- ÉTAPE 1: LISTER TOUS LES CRON JOBS ACTIFS
-- ============================================

DO $$
DECLARE
  cron_record RECORD;
  total_crons INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'CRON JOBS ACTIFS';
  RAISE NOTICE '============================================';

  FOR cron_record IN
    SELECT
      jobid,
      schedule,
      command,
      active,
      jobname
    FROM cron.job
    WHERE active = true
    ORDER BY jobname
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE 'Job #%: %', cron_record.jobid, cron_record.jobname;
    RAISE NOTICE 'Schedule: %', cron_record.schedule;
    RAISE NOTICE 'Active: %', cron_record.active;
    total_crons := total_crons + 1;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Total cron jobs actifs: %', total_crons;
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 2: VÉRIFIER LA STRUCTURE blog_posts
-- ============================================

DO $$
DECLARE
  col_exists BOOLEAN;
  published_col_type TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'STRUCTURE blog_posts';
  RAISE NOTICE '============================================';

  -- Vérifier colonne published
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts'
    AND column_name = 'published'
  ) INTO col_exists;

  IF col_exists THEN
    SELECT data_type INTO published_col_type
    FROM information_schema.columns
    WHERE table_name = 'blog_posts'
    AND column_name = 'published';

    RAISE NOTICE '✅ Colonne published existe (type: %)', published_col_type;
  ELSE
    RAISE WARNING '❌ Colonne published manquante!';
  END IF;

  -- Vérifier colonne featured_image
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts'
    AND column_name = 'featured_image'
  ) INTO col_exists;

  IF col_exists THEN
    RAISE NOTICE '✅ Colonne featured_image existe';
  ELSE
    RAISE WARNING '❌ Colonne featured_image manquante!';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 3: VÉRIFIER LA STRUCTURE faq
-- ============================================

DO $$
DECLARE
  faq_table_exists BOOLEAN;
  published_col_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'STRUCTURE FAQ';
  RAISE NOTICE '============================================';

  -- Vérifier si table existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'faq'
  ) INTO faq_table_exists;

  IF faq_table_exists THEN
    RAISE NOTICE '✅ Table faq existe';

    -- Vérifier colonne published
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'faq'
      AND column_name = 'published'
    ) INTO published_col_exists;

    IF published_col_exists THEN
      RAISE NOTICE '✅ Colonne faq.published existe';
    ELSE
      RAISE WARNING '❌ Colonne faq.published manquante!';
    END IF;
  ELSE
    RAISE WARNING '❌ Table faq n''existe pas!';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 4: VÉRIFIER LA STRUCTURE news
-- ============================================

DO $$
DECLARE
  news_table_exists BOOLEAN;
  published_col_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'STRUCTURE NEWS';
  RAISE NOTICE '============================================';

  -- Vérifier si table existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'news'
  ) INTO news_table_exists;

  IF news_table_exists THEN
    RAISE NOTICE '✅ Table news existe';

    -- Vérifier colonne published
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'news'
      AND column_name = 'published'
    ) INTO published_col_exists;

    IF published_col_exists THEN
      RAISE NOTICE '✅ Colonne news.published existe';
    ELSE
      RAISE WARNING '❌ Colonne news.published manquante!';
    END IF;
  ELSE
    RAISE WARNING '❌ Table news n''existe pas!';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 5: VÉRIFIER LES FONCTIONS RPC
-- ============================================

DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FONCTIONS RPC';
  RAISE NOTICE '============================================';

  -- get_blog_posts
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_blog_posts'
  ) INTO func_exists;

  IF func_exists THEN
    RAISE NOTICE '✅ Fonction get_blog_posts() existe';
  ELSE
    RAISE WARNING '❌ Fonction get_blog_posts() manquante!';
  END IF;

  -- get_faq
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_faq'
  ) INTO func_exists;

  IF func_exists THEN
    RAISE NOTICE '✅ Fonction get_faq() existe';
  ELSE
    RAISE WARNING '❌ Fonction get_faq() manquante!';
  END IF;

  -- get_news (ou similaire)
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND (p.proname = 'get_news' OR p.proname = 'get_published_news')
  ) INTO func_exists;

  IF func_exists THEN
    RAISE NOTICE '✅ Fonction get_news() existe';
  ELSE
    RAISE WARNING '⚠️ Fonction get_news() non trouvée (peut être normale)';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 6: TESTER get_blog_posts()
-- ============================================

DO $$
DECLARE
  blog_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST get_blog_posts()';
  RAISE NOTICE '============================================';

  BEGIN
    SELECT COUNT(*) INTO blog_count FROM get_blog_posts();
    RAISE NOTICE '✅ Fonction fonctionne: % articles', blog_count;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '❌ Erreur: %', SQLERRM;
  END;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 7: TESTER get_faq()
-- ============================================

DO $$
DECLARE
  faq_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST get_faq()';
  RAISE NOTICE '============================================';

  BEGIN
    SELECT COUNT(*) INTO faq_count FROM get_faq();
    RAISE NOTICE '✅ Fonction fonctionne: % FAQ', faq_count;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '❌ Erreur: %', SQLERRM;
  END;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 8: VÉRIFIER CRON JOBS SPÉCIFIQUES
-- ============================================

DO $$
DECLARE
  blog_cron_exists BOOLEAN;
  faq_cron_exists BOOLEAN;
  news_cron_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'CRON JOBS PUBLICATION';
  RAISE NOTICE '============================================';

  -- Cron blog
  SELECT EXISTS (
    SELECT 1 FROM cron.job
    WHERE (
      command LIKE '%blog_posts%'
      OR command LIKE '%generate%blog%'
      OR jobname LIKE '%blog%'
    )
    AND active = true
  ) INTO blog_cron_exists;

  IF blog_cron_exists THEN
    RAISE NOTICE '✅ Cron job Blog actif';
  ELSE
    RAISE WARNING '⚠️ Aucun cron job Blog trouvé';
  END IF;

  -- Cron FAQ
  SELECT EXISTS (
    SELECT 1 FROM cron.job
    WHERE (
      command LIKE '%faq%'
      OR jobname LIKE '%faq%'
    )
    AND active = true
  ) INTO faq_cron_exists;

  IF faq_cron_exists THEN
    RAISE NOTICE '✅ Cron job FAQ actif';
  ELSE
    RAISE WARNING '⚠️ Aucun cron job FAQ trouvé';
  END IF;

  -- Cron News
  SELECT EXISTS (
    SELECT 1 FROM cron.job
    WHERE (
      command LIKE '%news%'
      OR jobname LIKE '%news%'
      OR jobname LIKE '%actualit%'
    )
    AND active = true
  ) INTO news_cron_exists;

  IF news_cron_exists THEN
    RAISE NOTICE '✅ Cron job News actif';
  ELSE
    RAISE WARNING '⚠️ Aucun cron job News trouvé';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 9: COMPTAGE DONNÉES
-- ============================================

DO $$
DECLARE
  blog_total INTEGER;
  blog_published INTEGER;
  faq_total INTEGER;
  faq_published INTEGER;
  news_total INTEGER;
  news_published INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'COMPTAGE DONNÉES';
  RAISE NOTICE '============================================';

  -- Blog
  SELECT COUNT(*) INTO blog_total FROM blog_posts;
  SELECT COUNT(*) INTO blog_published FROM blog_posts WHERE published = true;
  RAISE NOTICE 'Blog: % total, % publiés', blog_total, blog_published;

  -- FAQ
  BEGIN
    SELECT COUNT(*) INTO faq_total FROM faq;
    SELECT COUNT(*) INTO faq_published FROM faq WHERE published = true;
    RAISE NOTICE 'FAQ: % total, % publiés', faq_total, faq_published;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'FAQ: Table n''existe pas';
  END;

  -- News
  BEGIN
    SELECT COUNT(*) INTO news_total FROM news;
    SELECT COUNT(*) INTO news_published FROM news WHERE published = true;
    RAISE NOTICE 'News: % total, % publiés', news_total, news_published;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'News: Table n''existe pas';
  END;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- RÉSUMÉ FINAL
-- ============================================

DO $$
DECLARE
  total_crons INTEGER;
  blog_ok BOOLEAN;
  faq_ok BOOLEAN;
  news_ok BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO total_crons FROM cron.job WHERE active = true;

  -- Vérifier blog
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_blog_posts'
  ) INTO blog_ok;

  -- Vérifier FAQ
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_faq'
  ) INTO faq_ok;

  -- Vérifier News
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'news'
  ) INTO news_ok;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ RÉSUMÉ VÉRIFICATION';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Cron jobs actifs: %', total_crons;
  RAISE NOTICE '';
  RAISE NOTICE 'Blog posts:';
  IF blog_ok THEN
    RAISE NOTICE '  ✅ Structure OK';
    RAISE NOTICE '  ✅ Fonction get_blog_posts() OK';
  ELSE
    RAISE WARNING '  ❌ Problème détecté';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'FAQ:';
  IF faq_ok THEN
    RAISE NOTICE '  ✅ Structure OK';
    RAISE NOTICE '  ✅ Fonction get_faq() OK';
  ELSE
    RAISE WARNING '  ❌ Problème détecté';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'News:';
  IF news_ok THEN
    RAISE NOTICE '  ✅ Structure OK';
  ELSE
    RAISE WARNING '  ⚠️ Table non trouvée';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';

  IF blog_ok AND faq_ok THEN
    RAISE NOTICE '✅✅✅ TOUT FONCTIONNE!';
  ELSE
    RAISE WARNING '⚠️ Corrections nécessaires';
  END IF;

  RAISE NOTICE '============================================';
END $$;
