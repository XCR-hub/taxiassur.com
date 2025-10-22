-- ============================================
-- DIAGNOSTIC IMMÉDIAT - À EXÉCUTER MAINTENANT
-- ============================================
-- Copier-coller ce fichier dans Supabase SQL Editor

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

-- Tâches d'apprentissage
SELECT
  '🤖 TÂCHES IA' as section,
  task_type as type,
  status,
  COUNT(*) as nombre,
  MAX(created_at) as derniere_tache
FROM ai_learning_tasks
GROUP BY task_type, status
ORDER BY MAX(created_at) DESC;

-- Logs d'erreurs récents
SELECT
  '⚠️ ERREURS RÉCENTES' as section,
  created_at as quand,
  level as niveau,
  message,
  details
FROM ai_learning_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND level IN ('error', 'warning')
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 5. PROBLÈMES DÉTECTÉS
-- ============================================
SELECT
  '❌ PROBLÈME' as statut,
  'Aucun cron job actif' as description,
  'CRITIQUE' as priorite,
  'Exécuter ACTIVER-REELLEMENT-AUTOMATISATIONS.sql' as solution
WHERE (SELECT COUNT(*) FROM cron.job WHERE active = true) = 0

UNION ALL

SELECT
  '❌ PROBLÈME',
  'Aucun article généré cette semaine',
  'HAUTE',
  'Vérifier clé OpenAI dans secrets Supabase'
WHERE (SELECT COUNT(*) FROM blog_posts WHERE created_at > NOW() - INTERVAL '7 days') = 0

UNION ALL

SELECT
  '❌ PROBLÈME',
  'Aucune donnée SEO récente',
  'HAUTE',
  'Configurer GOOGLE_SEARCH_CONSOLE_API_KEY'
WHERE (SELECT COUNT(*) FROM seo_metrics WHERE date > NOW() - INTERVAL '7 days') = 0

UNION ALL

SELECT
  '❌ PROBLÈME',
  'Aucun post social publié cette semaine',
  'MOYENNE',
  'Configurer PINTEREST_ACCESS_TOKEN et activer cron'
WHERE (SELECT COUNT(*) FROM social_posts WHERE created_at > NOW() - INTERVAL '7 days' AND status = 'published') = 0

UNION ALL

SELECT
  '❌ PROBLÈME',
  'IA auto-apprenante inactive',
  'HAUTE',
  'Aucune tâche IA exécutée récemment'
WHERE (SELECT COUNT(*) FROM ai_learning_tasks WHERE created_at > NOW() - INTERVAL '24 hours') = 0

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
  '💡 RECOMMANDATION' as type,
  CASE
    WHEN (SELECT COUNT(*) FROM cron.job WHERE active = true) = 0
    THEN '1. Activer les cron jobs avec ACTIVER-REELLEMENT-AUTOMATISATIONS.sql'
    WHEN (SELECT COUNT(*) FROM blog_posts WHERE created_at > NOW() - INTERVAL '7 days') = 0
    THEN '2. Configurer OPENAI_API_KEY dans Supabase secrets'
    WHEN (SELECT COUNT(*) FROM seo_metrics WHERE date > NOW() - INTERVAL '7 days') = 0
    THEN '3. Configurer GOOGLE_SEARCH_CONSOLE_API_KEY'
    WHEN (SELECT COUNT(*) FROM social_posts WHERE status = 'published' AND created_at > NOW() - INTERVAL '7 days') = 0
    THEN '4. Configurer PINTEREST_ACCESS_TOKEN'
    ELSE '5. Système opérationnel - Attendre 24-48h pour résultats'
  END as action_prioritaire;
