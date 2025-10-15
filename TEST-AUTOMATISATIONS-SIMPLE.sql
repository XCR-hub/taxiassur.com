/*
  # Test Rapide des Automatisations TaxiAssur

  Version simplifiée et robuste qui gère les tables manquantes.
  Exécution rapide : ~5 secondes
*/

-- ============================================================
-- 1️⃣ CRON JOBS
-- ============================================================

DO $$
DECLARE
  total_crons INTEGER;
  active_crons INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE active = true)
  INTO total_crons, active_crons
  FROM cron.job;

  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '🔍 CRON JOBS';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '  Total : %', total_crons;
  RAISE NOTICE '  Actifs : % ✅', active_crons;
  RAISE NOTICE '  Inactifs : % ⚠️', total_crons - active_crons;
  RAISE NOTICE '';

  IF active_crons = 0 THEN
    RAISE NOTICE '⚠️ AUCUN cron job actif !';
    RAISE NOTICE '   → Exécute ACTIVATION-TOTALE-AUTOMATISATIONS.sql';
  ELSE
    RAISE NOTICE '✅ Automatisations activées !';
  END IF;
  RAISE NOTICE '';
END $$;

-- Liste détaillée des crons
SELECT
  jobname as "Job",
  schedule as "Planning",
  CASE WHEN active THEN '✅' ELSE '❌' END as "Status"
FROM cron.job
ORDER BY active DESC, jobname;

-- ============================================================
-- 2️⃣ TABLES ET DONNÉES
-- ============================================================

DO $$
DECLARE
  blog_count INTEGER := 0;
  faq_count INTEGER := 0;
  city_count INTEGER := 0;
  leads_count INTEGER := 0;
  leads_24h INTEGER := 0;
BEGIN
  -- Blog posts
  SELECT COUNT(*) INTO blog_count FROM blog_posts;

  -- FAQ
  SELECT COUNT(*) INTO faq_count FROM faq_entries;

  -- City pages
  SELECT COUNT(*) INTO city_count FROM city_pages;

  -- Leads
  SELECT COUNT(*) INTO leads_count FROM leads;
  SELECT COUNT(*) INTO leads_24h FROM leads WHERE created_at >= NOW() - INTERVAL '24 hours';

  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '📊 DONNÉES';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '📝 Articles de blog : %', blog_count;
  RAISE NOTICE '❓ FAQ : %', faq_count;
  RAISE NOTICE '🏙️ Pages villes : %', city_count;
  RAISE NOTICE '👥 Leads total : %', leads_count;
  RAISE NOTICE '👥 Leads 24h : %', leads_24h;
  RAISE NOTICE '';

  -- Alertes
  IF blog_count = 0 THEN
    RAISE NOTICE '⚠️ Aucun article → Exécute IMPORT-FAQ-CITIES-SUPABASE.sql';
  END IF;

  IF faq_count < 8 THEN
    RAISE NOTICE '⚠️ FAQ incomplètes (% / 8) → Exécute IMPORT-FAQ-CITIES-SUPABASE.sql', faq_count;
  END IF;

  IF city_count < 5 THEN
    RAISE NOTICE '⚠️ Villes incomplètes (% / 5) → Exécute IMPORT-FAQ-CITIES-SUPABASE.sql', city_count;
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================
-- 3️⃣ TABLES OPTIONNELLES
-- ============================================================

DO $$
DECLARE
  news_exists BOOLEAN;
  social_exists BOOLEAN;
  backlinks_exists BOOLEAN;
  ai_exists BOOLEAN;
BEGIN
  -- Vérifier existence des tables
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'news_articles' AND table_schema = 'public') INTO news_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_media_posts' AND table_schema = 'public') INTO social_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backlink_opportunities' AND table_schema = 'public') INTO backlinks_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_learning_data' AND table_schema = 'public') INTO ai_exists;

  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '🔧 FONCTIONNALITÉS AVANCÉES';
  RAISE NOTICE '════════════════════════════════════════════════';

  IF news_exists THEN
    RAISE NOTICE '✅ Actualités : % articles', (SELECT COUNT(*) FROM news_articles);
  ELSE
    RAISE NOTICE '⚠️ Actualités : non configuré';
  END IF;

  IF social_exists THEN
    RAISE NOTICE '✅ Réseaux sociaux : % posts', (SELECT COUNT(*) FROM social_media_posts);
  ELSE
    RAISE NOTICE '⚠️ Réseaux sociaux : non configuré';
  END IF;

  IF backlinks_exists THEN
    RAISE NOTICE '✅ Backlinks : % opportunités', (SELECT COUNT(*) FROM backlink_opportunities);
  ELSE
    RAISE NOTICE '⚠️ Backlinks : non configuré';
  END IF;

  IF ai_exists THEN
    RAISE NOTICE '✅ IA Auto-apprenante : % données', (SELECT COUNT(*) FROM ai_learning_data);
  ELSE
    RAISE NOTICE '⚠️ IA Auto-apprenante : non configuré';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================
-- 4️⃣ TEST CRÉATION LEAD
-- ============================================================

DO $$
DECLARE
  lead_id UUID;
  existing_lead UUID;
BEGIN
  -- Vérifier si le lead existe déjà
  SELECT id INTO existing_lead FROM leads WHERE email = 'test-automation@taxiassur.fr';

  IF existing_lead IS NOT NULL THEN
    -- Mettre à jour le lead existant
    UPDATE leads SET
      updated_at = NOW(),
      name = 'Test Automatisation ' || NOW()::date
    WHERE id = existing_lead
    RETURNING id INTO lead_id;

    RAISE NOTICE '════════════════════════════════════════════════';
    RAISE NOTICE '🧪 TEST LEAD';
    RAISE NOTICE '════════════════════════════════════════════════';
    RAISE NOTICE '✅ Lead de test mis à jour';
    RAISE NOTICE '   ID : %', lead_id;
    RAISE NOTICE '   Email : test-automation@taxiassur.fr';
    RAISE NOTICE '';
  ELSE
    -- Insérer un nouveau lead de test
    INSERT INTO leads (
      name,
      email,
      phone,
      city,
      status,
      lead_status,
      source
    )
    VALUES (
      'Test Automatisation ' || NOW()::date,
      'test-automation@taxiassur.fr',
      '0123456789',
      'Paris',
      'taxi',
      'nouveau',
      'test_automatisation'
    )
    RETURNING id INTO lead_id;

    RAISE NOTICE '════════════════════════════════════════════════';
    RAISE NOTICE '🧪 TEST LEAD';
    RAISE NOTICE '════════════════════════════════════════════════';
    RAISE NOTICE '✅ Lead de test créé';
    RAISE NOTICE '   ID : %', lead_id;
    RAISE NOTICE '   Email : test-automation@taxiassur.fr';
    RAISE NOTICE '';
  END IF;
END $$;

-- ============================================================
-- 5️⃣ DERNIÈRES ACTIVITÉS
-- ============================================================

-- Derniers leads (3 plus récents)
SELECT
  '👥 DERNIERS LEADS' as "Type",
  name as "Nom",
  email as "Email",
  city as "Ville",
  status as "Type",
  lead_status as "Statut",
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as "Créé le"
FROM leads
ORDER BY created_at DESC
LIMIT 3;

-- Derniers articles (3 plus récents)
SELECT
  '📝 DERNIERS ARTICLES' as "Type",
  title as "Titre",
  CASE WHEN published THEN '✅ Publié' ELSE '📝 Brouillon' END as "Status",
  TO_CHAR(created_at, 'DD/MM/YYYY') as "Créé le"
FROM blog_posts
ORDER BY created_at DESC
LIMIT 3;

-- ============================================================
-- 6️⃣ SÉCURITÉ RLS
-- ============================================================

DO $$
DECLARE
  blog_rls BOOLEAN;
  faq_rls BOOLEAN;
  city_rls BOOLEAN;
  leads_rls BOOLEAN;
BEGIN
  -- Vérifier RLS activé
  SELECT relrowsecurity INTO blog_rls FROM pg_class WHERE relname = 'blog_posts';
  SELECT relrowsecurity INTO faq_rls FROM pg_class WHERE relname = 'faq_entries';
  SELECT relrowsecurity INTO city_rls FROM pg_class WHERE relname = 'city_pages';
  SELECT relrowsecurity INTO leads_rls FROM pg_class WHERE relname = 'leads';

  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '🔒 SÉCURITÉ RLS';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE 'blog_posts : %', CASE WHEN blog_rls THEN '✅ Activé' ELSE '❌ Désactivé' END;
  RAISE NOTICE 'faq_entries : %', CASE WHEN faq_rls THEN '✅ Activé' ELSE '❌ Désactivé' END;
  RAISE NOTICE 'city_pages : %', CASE WHEN city_rls THEN '✅ Activé' ELSE '❌ Désactivé' END;
  RAISE NOTICE 'leads : %', CASE WHEN leads_rls THEN '✅ Activé' ELSE '❌ Désactivé' END;
  RAISE NOTICE '';
END $$;

-- ============================================================
-- 7️⃣ RÉSUMÉ FINAL
-- ============================================================

DO $$
DECLARE
  total_crons INTEGER;
  active_crons INTEGER;
  total_leads INTEGER;
  total_articles INTEGER;
  total_faq INTEGER;
  total_cities INTEGER;
  score INTEGER := 0;
  max_score INTEGER := 6;
BEGIN
  -- Collecter les stats
  SELECT COUNT(*), COUNT(*) FILTER (WHERE active = true) INTO total_crons, active_crons FROM cron.job;
  SELECT COUNT(*) INTO total_leads FROM leads;
  SELECT COUNT(*) INTO total_articles FROM blog_posts;
  SELECT COUNT(*) INTO total_faq FROM faq_entries;
  SELECT COUNT(*) INTO total_cities FROM city_pages;

  -- Calculer le score
  IF active_crons > 0 THEN score := score + 1; END IF;
  IF total_articles > 0 THEN score := score + 1; END IF;
  IF total_faq >= 8 THEN score := score + 1; END IF;
  IF total_cities >= 5 THEN score := score + 1; END IF;
  IF total_leads > 0 THEN score := score + 1; END IF;
  IF EXISTS (SELECT 1 FROM blog_posts WHERE published = true) THEN score := score + 1; END IF;

  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '🏆 RÉSUMÉ FINAL';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Score système : % / %', score, max_score;
  RAISE NOTICE '';
  RAISE NOTICE '  🔧 Crons actifs : % / %', active_crons, total_crons;
  RAISE NOTICE '  📝 Articles : %', total_articles;
  RAISE NOTICE '  ❓ FAQ : %', total_faq;
  RAISE NOTICE '  🏙️ Villes : %', total_cities;
  RAISE NOTICE '  👥 Leads : %', total_leads;
  RAISE NOTICE '';

  -- Statut global
  IF score = max_score THEN
    RAISE NOTICE '✅✅✅ SYSTÈME 100%% OPÉRATIONNEL ! ✅✅✅';
  ELSIF score >= 4 THEN
    RAISE NOTICE '✅ Système fonctionnel (% / %)', score, max_score;
    RAISE NOTICE '   Quelques fonctionnalités à activer';
  ELSIF score >= 2 THEN
    RAISE NOTICE '⚠️ Système partiellement configuré (% / %)', score, max_score;
    RAISE NOTICE '   Actions requises (voir ci-dessus)';
  ELSE
    RAISE NOTICE '❌ Système non configuré (% / %)', score, max_score;
    RAISE NOTICE '   → Commence par IMPORT-FAQ-CITIES-SUPABASE.sql';
    RAISE NOTICE '   → Puis ACTIVATION-TOTALE-AUTOMATISATIONS.sql';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '✅ Test terminé avec succès !';
  RAISE NOTICE '════════════════════════════════════════════════';
END $$;
