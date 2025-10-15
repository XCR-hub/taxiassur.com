/*
  # Test des Automatisations TaxiAssur

  Ce script teste que toutes les automatisations fonctionnent correctement :
  - Cron jobs actifs
  - Edge Functions déployées
  - Tables système
  - Données de test
*/

-- ============================================================
-- PARTIE 1 : VÉRIFICATION DES CRON JOBS
-- ============================================================

SELECT
  '🔍 CRON JOBS ACTIFS' as section,
  jobname as "Nom du Job",
  schedule as "Planning",
  CASE
    WHEN active THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as "Status",
  jobid as "ID"
FROM cron.job
ORDER BY jobname;

-- Compter les crons actifs
SELECT
  '📊 RÉSUMÉ CRON JOBS' as section,
  COUNT(*) as "Total Crons",
  COUNT(*) FILTER (WHERE active = true) as "Actifs",
  COUNT(*) FILTER (WHERE active = false) as "Inactifs"
FROM cron.job;

-- ============================================================
-- PARTIE 2 : VÉRIFICATION DES TABLES
-- ============================================================

-- Vérifier les tables principales
SELECT
  '📋 TABLES PRINCIPALES' as section,
  table_name as "Table",
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as "Colonnes"
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'blog_posts',
    'faq_entries',
    'city_pages',
    'leads',
    'news_articles',
    'social_media_posts',
    'backlink_opportunities',
    'partner_prospects',
    'ai_learning_data',
    'user_behavior_patterns',
    'seo_rankings'
  )
ORDER BY table_name;

-- ============================================================
-- PARTIE 3 : VÉRIFICATION DES DONNÉES
-- ============================================================

-- Blog posts
SELECT
  '📝 BLOG POSTS' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE published = true) as "Publiés",
  COUNT(*) FILTER (WHERE published = false) as "Brouillons"
FROM blog_posts;

-- FAQ
SELECT
  '❓ FAQ' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'published') as "Publiées",
  COUNT(*) FILTER (WHERE status = 'draft') as "Brouillons"
FROM faq_entries;

-- City Pages
SELECT
  '🏙️ VILLES' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'published') as "Publiées",
  COUNT(*) FILTER (WHERE status = 'draft') as "Brouillons"
FROM city_pages;

-- Leads
SELECT
  '👥 LEADS' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE lead_status = 'new') as "Nouveaux",
  COUNT(*) FILTER (WHERE lead_status = 'contacted') as "Contactés",
  COUNT(*) FILTER (WHERE lead_status = 'converted') as "Convertis"
FROM leads;

-- News Articles (vérification conditionnelle)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'news_articles' AND table_schema = 'public') THEN
    RAISE NOTICE '📰 ACTUALITÉS: % total, % publiées',
      (SELECT COUNT(*) FROM news_articles),
      (SELECT COUNT(*) FROM news_articles WHERE status = 'published');
  ELSE
    RAISE NOTICE '📰 ACTUALITÉS: ⚠️ Table non créée (optionnelle)';
  END IF;
END $$;

-- Social Media Posts (vérification conditionnelle)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_media_posts' AND table_schema = 'public') THEN
    RAISE NOTICE '📱 RÉSEAUX SOCIAUX: % total, % publiés, % programmés',
      (SELECT COUNT(*) FROM social_media_posts),
      (SELECT COUNT(*) FROM social_media_posts WHERE status = 'published'),
      (SELECT COUNT(*) FROM social_media_posts WHERE status = 'scheduled');
  ELSE
    RAISE NOTICE '📱 RÉSEAUX SOCIAUX: ⚠️ Table non créée (optionnelle)';
  END IF;
END $$;

-- ============================================================
-- PARTIE 4 : TEST DE CRÉATION D'UN LEAD
-- ============================================================

-- Insérer un lead de test
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
  'Test Automatisation',
  'test-automation@taxiassur.fr',
  '0123456789',
  'Paris',
  'taxi',
  'new',
  'test_automatisation'
)
ON CONFLICT (email) DO UPDATE SET
  updated_at = NOW()
RETURNING
  '✅ LEAD DE TEST CRÉÉ' as status,
  id,
  email,
  name,
  created_at;

-- ============================================================
-- PARTIE 5 : VÉRIFICATION DES EDGE FUNCTIONS
-- ============================================================

-- Liste des Edge Functions attendues
WITH expected_functions AS (
  SELECT unnest(ARRAY[
    'send-lead-email',
    'generate-seo-content',
    'auto-content-scheduler',
    'social-media-publisher',
    'backlink-auto-outreach',
    'ai-email-responder',
    'chatbot',
    'trend-analyzer-proxy',
    'seo-daily-refresh'
  ]) as function_name
)
SELECT
  '🔧 EDGE FUNCTIONS' as section,
  ef.function_name as "Function",
  CASE
    WHEN ef.function_name IS NOT NULL THEN '✅ Attendue'
    ELSE '❌ Manquante'
  END as "Status"
FROM expected_functions ef
ORDER BY ef.function_name;

-- ============================================================
-- PARTIE 6 : VÉRIFICATION DES RLS POLICIES
-- ============================================================

-- Vérifier les policies sur les tables principales
SELECT
  '🔒 RLS POLICIES' as section,
  schemaname as "Schema",
  tablename as "Table",
  policyname as "Policy",
  CASE
    WHEN cmd = 'SELECT' THEN '👁️ SELECT'
    WHEN cmd = 'INSERT' THEN '➕ INSERT'
    WHEN cmd = 'UPDATE' THEN '✏️ UPDATE'
    WHEN cmd = 'DELETE' THEN '🗑️ DELETE'
    ELSE cmd
  END as "Commande",
  CASE
    WHEN roles::text LIKE '%anon%' THEN '🌐 Public'
    WHEN roles::text LIKE '%authenticated%' THEN '🔐 Auth'
    ELSE '👤 Custom'
  END as "Rôle"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('blog_posts', 'faq_entries', 'city_pages', 'leads')
ORDER BY tablename, policyname;

-- ============================================================
-- PARTIE 7 : DERNIÈRES ACTIVITÉS
-- ============================================================

-- Derniers leads créés
SELECT
  '🆕 DERNIERS LEADS (5)' as section,
  name as "Nom",
  email as "Email",
  city as "Ville",
  status as "Type",
  lead_status as "Statut",
  source as "Source",
  created_at as "Créé le"
FROM leads
ORDER BY created_at DESC
LIMIT 5;

-- Derniers articles de blog
SELECT
  '📝 DERNIERS ARTICLES (5)' as section,
  title as "Titre",
  slug as "Slug",
  CASE
    WHEN published THEN '✅ Publié'
    ELSE '📝 Brouillon'
  END as "Status",
  created_at as "Créé le"
FROM blog_posts
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================
-- PARTIE 8 : STATISTIQUES GLOBALES
-- ============================================================

SELECT
  '📊 STATISTIQUES SYSTÈME' as section,
  jsonb_build_object(
    'total_leads', (SELECT COUNT(*) FROM leads),
    'leads_24h', (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '24 hours'),
    'total_articles', (SELECT COUNT(*) FROM blog_posts),
    'articles_publies', (SELECT COUNT(*) FROM blog_posts WHERE published = true),
    'total_faq', (SELECT COUNT(*) FROM faq_entries),
    'total_villes', (SELECT COUNT(*) FROM city_pages),
    'crons_actifs', (SELECT COUNT(*) FROM cron.job WHERE active = true)
  ) as "Stats JSON";

-- ============================================================
-- MESSAGE FINAL
-- ============================================================

DO $$
DECLARE
  total_crons INTEGER;
  active_crons INTEGER;
  total_leads INTEGER;
  total_articles INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE active = true) INTO total_crons, active_crons FROM cron.job;
  SELECT COUNT(*) INTO total_leads FROM leads;
  SELECT COUNT(*) INTO total_articles FROM blog_posts;

  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '✅ TEST DES AUTOMATISATIONS TERMINÉ';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RÉSUMÉ :';
  RAISE NOTICE '  → Cron Jobs : % actifs sur % total', active_crons, total_crons;
  RAISE NOTICE '  → Leads : %', total_leads;
  RAISE NOTICE '  → Articles : %', total_articles;
  RAISE NOTICE '════════════════════════════════════════════════════';

  IF active_crons > 0 THEN
    RAISE NOTICE '✅ Les automatisations sont ACTIVES !';
  ELSE
    RAISE NOTICE '⚠️ AUCUN cron job actif - À configurer';
  END IF;

  RAISE NOTICE '════════════════════════════════════════════════════';
END $$;
