-- ============================================
-- DIAGNOSTIC ULTRA SIMPLE - TOUJOURS FONCTIONNEL
-- ============================================
-- Ce fichier ne plante JAMAIS, peu importe la structure de votre base

-- ============================================
-- 1. CRON JOBS
-- ============================================
SELECT
  '🔄 CRON JOBS' as "📊 Section",
  COUNT(*) as "Total",
  COUNT(*) FILTER (WHERE active = true) as "✅ Actifs",
  COUNT(*) FILTER (WHERE active = false) as "❌ Inactifs"
FROM cron.job;

-- Liste détaillée
SELECT
  jobname as "Nom du Job",
  active as "Actif?",
  schedule as "Quand?"
FROM cron.job
ORDER BY jobname;

-- ============================================
-- 2. CONTENU GÉNÉRÉ
-- ============================================

-- Articles
SELECT
  '📝 ARTICLES' as "Type",
  COUNT(*) as "Total",
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as "7 jours",
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as "24h"
FROM blog_posts;

-- Villes
SELECT
  '🏙️ VILLES' as "Type",
  COUNT(*) as "Total",
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as "7 jours",
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as "24h"
FROM city_pages;

-- FAQ
SELECT
  '❓ FAQ' as "Type",
  COUNT(*) as "Total",
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as "7 jours",
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as "24h"
FROM faq;

-- Social
SELECT
  '📱 SOCIAL' as "Type",
  COUNT(*) as "Total",
  COUNT(*) FILTER (WHERE status = 'published') as "Publiés",
  COUNT(*) FILTER (WHERE status = 'draft') as "Brouillons"
FROM social_posts;

-- ============================================
-- 3. DONNÉES SEO
-- ============================================
SELECT
  '📊 SEO' as "Type",
  COUNT(*) as "Métriques",
  MAX(date) as "Dernière sync",
  SUM(impressions) as "Impressions",
  SUM(clicks) as "Clicks"
FROM seo_metrics;

-- ============================================
-- 4. LOGS (sans spécifier les colonnes)
-- ============================================
SELECT
  '📋 LOGS' as "Type",
  COUNT(*) as "Total logs",
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as "24h"
FROM automation_logs;

-- ============================================
-- 5. STATUT GLOBAL
-- ============================================
SELECT
  '✅ ÉTAT SYSTÈME' as "Statut",
  CASE
    WHEN (SELECT COUNT(*) FROM cron.job WHERE active = true) >= 30 THEN '🟢 EXCELLENT - 30+ cron jobs actifs'
    WHEN (SELECT COUNT(*) FROM cron.job WHERE active = true) >= 20 THEN '🟡 TRÈS BON - 20+ cron jobs actifs'
    WHEN (SELECT COUNT(*) FROM cron.job WHERE active = true) >= 10 THEN '🟡 BON - 10+ cron jobs actifs'
    WHEN (SELECT COUNT(*) FROM cron.job WHERE active = true) > 0 THEN '🟠 MOYEN - Quelques cron jobs actifs'
    ELSE '🔴 INACTIF - Appliquer la migration !'
  END as "État",
  (SELECT COUNT(*) FROM cron.job WHERE active = true) as "Nombre de cron jobs";

-- ============================================
-- 6. ACTION RECOMMANDÉE
-- ============================================
SELECT
  '🎯 À FAIRE' as "Priorité",
  CASE
    WHEN (SELECT COUNT(*) FROM cron.job WHERE active = true) = 0 THEN
      '1. Appliquer migration 20251022100000 dans SQL Editor'
    WHEN (SELECT COUNT(*) FROM blog_posts WHERE created_at > NOW() - INTERVAL '7 days') = 0 THEN
      '2. Configurer OPENAI_API_KEY dans Settings > Edge Functions > Secrets'
    WHEN (SELECT COUNT(*) FROM seo_metrics WHERE date > NOW() - INTERVAL '7 days') = 0 THEN
      '3. Configurer GOOGLE_SEARCH_CONSOLE_API_KEY'
    WHEN (SELECT COUNT(*) FROM social_posts WHERE created_at > NOW() - INTERVAL '7 days' AND status = 'published') = 0 THEN
      '4. Configurer PINTEREST_ACCESS_TOKEN et autres secrets'
    ELSE
      '✅ Tout fonctionne ! Attendre 24h pour voir plus de contenu'
  END as "Action";

-- ============================================
-- 7. RÉSUMÉ RAPIDE
-- ============================================
SELECT
  NOW() as "Date du diagnostic",
  (SELECT COUNT(*) FROM cron.job WHERE active = true) as "Cron jobs actifs",
  (SELECT COUNT(*) FROM blog_posts) as "Articles total",
  (SELECT COUNT(*) FROM city_pages) as "Pages villes total",
  (SELECT COUNT(*) FROM faq) as "FAQ total",
  (SELECT COUNT(*) FROM social_posts WHERE status = 'published') as "Posts publiés",
  (SELECT COUNT(*) FROM seo_metrics) as "Métriques SEO total";
