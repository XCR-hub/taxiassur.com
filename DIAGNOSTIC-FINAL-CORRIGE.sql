-- ============================================
-- DIAGNOSTIC IMMÉDIAT - À EXÉCUTER MAINTENANT
-- ============================================
-- Copier-coller ce fichier dans Supabase SQL Editor
-- Version corrigée avec automation_type au lieu de action_type

-- ============================================
-- 1. CRON JOBS - Sont-ils actifs ?
-- ============================================
SELECT
  '🔄 CRON JOBS' as section,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE active = true) as actifs,
  COUNT(*) FILTER (WHERE active = false) as inactifs
FROM cron.job;

-- Détail de chaque cron job
SELECT
  jobname as "Nom",
  active as "Actif?",
  schedule as "Planification"
FROM cron.job
ORDER BY jobname;

-- ============================================
-- 2. CONTENU GÉNÉRÉ - Y a-t-il du nouveau ?
-- ============================================

-- Articles de blog
SELECT
  '📝 ARTICLES BLOG' as section,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as cette_semaine,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as aujourdhui,
  MAX(created_at) as dernier_article
FROM blog_posts;

-- Pages villes
SELECT
  '🏙️ PAGES VILLES' as section,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as cette_semaine,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as aujourdhui,
  MAX(created_at) as derniere_page
FROM city_pages;

-- FAQ
SELECT
  '❓ FAQ' as section,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as cette_semaine,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as aujourdhui,
  MAX(created_at) as derniere_faq
FROM faq;

-- Posts réseaux sociaux
SELECT
  '📱 POSTS SOCIAUX' as section,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as cette_semaine,
  COUNT(*) FILTER (WHERE status = 'published') as publies,
  COUNT(*) FILTER (WHERE status = 'draft') as brouillons
FROM social_posts;

-- ============================================
-- 3. DONNÉES SEO - Sont-elles récupérées ?
-- ============================================
SELECT
  '📊 DONNÉES SEO' as section,
  COUNT(*) as total_metriques,
  COUNT(*) FILTER (WHERE date > NOW() - INTERVAL '7 days') as cette_semaine,
  COUNT(*) FILTER (WHERE date > NOW() - INTERVAL '24 hours') as aujourdhui,
  MAX(date) as derniere_synchro,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks
FROM seo_metrics;

-- ============================================
-- 4. IA AUTO-APPRENANTE - Fonctionne-t-elle ?
-- ============================================

-- Données d'apprentissage IA
SELECT
  '🤖 DONNÉES IA' as section,
  COUNT(*) as nombre_total,
  MAX(created_at) as derniere_donnee
FROM ai_learning_data;

-- Logs d'automatisation récents (automation_type au lieu de action_type)
SELECT
  '📋 LOGS RÉCENTS' as section,
  created_at as quand,
  automation_type as type,
  status,
  error_message
FROM automation_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 5. PROBLÈMES DÉTECTÉS
-- ============================================
SELECT
  '❌ PROBLÈME' as statut,
  'Aucun cron job actif' as description,
  'CRITIQUE' as priorite,
  'Appliquer la migration 20251022100000' as solution
WHERE (SELECT COUNT(*) FROM cron.job WHERE active = true) = 0

UNION ALL

SELECT
  '❌ PROBLÈME',
  'Aucun article blog récent',
  'HAUTE',
  'Configurer OPENAI_API_KEY dans Supabase Edge Functions'
WHERE (SELECT COUNT(*) FROM blog_posts WHERE created_at > NOW() - INTERVAL '7 days') = 0

UNION ALL

SELECT
  '❌ PROBLÈME',
  'Aucune donnée SEO récente',
  'MOYENNE',
  'Configurer GOOGLE_SEARCH_CONSOLE_API_KEY'
WHERE (SELECT COUNT(*) FROM seo_metrics WHERE date > NOW() - INTERVAL '7 days') = 0

UNION ALL

SELECT
  '❌ PROBLÈME',
  'Aucun post social publié',
  'MOYENNE',
  'Configurer PINTEREST_ACCESS_TOKEN et autres secrets'
WHERE (SELECT COUNT(*) FROM social_posts WHERE created_at > NOW() - INTERVAL '7 days' AND status = 'published') = 0

UNION ALL

SELECT
  '❌ PROBLÈME',
  'IA auto-apprenante inactive',
  'HAUTE',
  'Aucune donnée IA récente'
WHERE (SELECT COUNT(*) FROM ai_learning_data WHERE created_at > NOW() - INTERVAL '24 hours') = 0

UNION ALL

SELECT
  '✅ OK',
  'Tout fonctionne correctement',
  'INFO',
  'Continuer à surveiller'
WHERE (SELECT COUNT(*) FROM cron.job WHERE active = true) > 0
  AND (SELECT COUNT(*) FROM blog_posts WHERE created_at > NOW() - INTERVAL '7 days') > 0
  AND (SELECT COUNT(*) FROM seo_metrics WHERE date > NOW() - INTERVAL '7 days') > 0;

-- ============================================
-- 6. RECOMMANDATIONS
-- ============================================
SELECT
  '🎯 ACTION' as type,
  CASE
    WHEN (SELECT COUNT(*) FROM cron.job WHERE active = true) = 0
      THEN 'Appliquer la migration 20251022100000 dans SQL Editor'
    WHEN (SELECT COUNT(*) FROM blog_posts WHERE created_at > NOW() - INTERVAL '7 days') = 0
      THEN 'Configurer les secrets API dans Edge Functions'
    WHEN (SELECT COUNT(*) FROM seo_metrics WHERE date > NOW() - INTERVAL '7 days') = 0
      THEN 'Vérifier GOOGLE_SEARCH_CONSOLE_API_KEY'
    WHEN (SELECT COUNT(*) FROM social_posts WHERE status = 'published' AND created_at > NOW() - INTERVAL '7 days') = 0
      THEN 'Configurer PINTEREST_ACCESS_TOKEN'
    ELSE 'Tout est configuré - Attendre 24h pour voir le contenu généré'
  END as recommandation;
