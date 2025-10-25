/*
  # Diagnostic complet de l'état de la base de données

  Ce script vérifie quelles migrations ont été appliquées
  et quelles fonctions/tables existent.

  EXÉCUTEZ CE SCRIPT EN PREMIER pour savoir où vous en êtes !
*/

-- 1. Vérifier tables principales
SELECT
  'TABLES EXISTANTES' as diagnostic,
  string_agg(table_name, ', ' ORDER BY table_name) as resultat
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'leads', 'blog_posts', 'city_pages', 'faq', 'news_articles',
    'social_networks', 'page_views', 'ai_learning_history', 'seo_metrics',
    'backlink_opportunities', 'partner_prospects'
  );

-- 2. Vérifier colonnes seo_metrics
SELECT
  'COLONNES seo_metrics' as diagnostic,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as resultat
FROM information_schema.columns
WHERE table_name = 'seo_metrics';

-- 3. Vérifier fonctions RPC importantes
SELECT
  'FONCTIONS RPC' as diagnostic,
  string_agg(routine_name, ', ' ORDER BY routine_name) as resultat
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name IN (
    'get_leads_stats',
    'populate_real_seo_metrics',
    'get_current_seo_metrics'
  );

-- 4. Vérifier colonne metadata dans social_networks
SELECT
  'social_networks.metadata' as diagnostic,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'social_networks' AND column_name = 'metadata'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as resultat;

-- 5. Vérifier colonne category dans blog_posts
SELECT
  'blog_posts.category' as diagnostic,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'blog_posts' AND column_name = 'category'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as resultat;

-- 6. Vérifier colonne average_position dans seo_metrics
SELECT
  'seo_metrics.average_position' as diagnostic,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'seo_metrics' AND column_name = 'average_position'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as resultat;

-- 7. Vérifier table page_views
SELECT
  'table page_views' as diagnostic,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'page_views'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as resultat;

-- 8. Vérifier table ai_learning_history
SELECT
  'table ai_learning_history' as diagnostic,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'ai_learning_history'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as resultat;

-- 9. Compter les leads
SELECT
  'TOTAL LEADS' as diagnostic,
  COUNT(*)::text as resultat
FROM leads;

-- 10. Compter les blog posts
SELECT
  'TOTAL BLOG POSTS' as diagnostic,
  COUNT(*)::text as resultat
FROM blog_posts;

-- RÉSUMÉ FINAL
SELECT '
═══════════════════════════════════════════════════════════
                    RÉSUMÉ DIAGNOSTIC
═══════════════════════════════════════════════════════════

À FAIRE EN FONCTION DES RÉSULTATS :

❌ Si populate_real_seo_metrics() manquante
   → Appliquer migration 1 (20251016060000)

❌ Si average_position manquante dans seo_metrics
   → Appliquer migration 4 (20251016095000)

❌ Si get_current_seo_metrics() manquante ou erreur
   → Appliquer migration 2 (20251016080000)

✅ Si toutes les fonctions existent
   → Tester les fonctions

═══════════════════════════════════════════════════════════
' as instructions;
