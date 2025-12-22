-- ============================================
-- DIAGNOSTIC SIMPLE - TOUJOURS FONCTIONNEL
-- ============================================
-- Utilisez ce fichier si DIAGNOSTIC-MAINTENANT.sql plante

-- ============================================
-- 1. CRON JOBS - Les automatisations
-- ============================================
SELECT
  '🔄 CRON JOBS' as "Section",
  COUNT(*) as "Total",
  COUNT(*) FILTER (WHERE active = true) as "Actifs",
  COUNT(*) FILTER (WHERE active = false) as "Inactifs"
FROM cron.job;

-- Liste des cron jobs
SELECT
  jobname as "Nom du Job",
  active as "Actif?",
  schedule as "Quand?"
FROM cron.job
ORDER BY jobname;

-- ============================================
-- 2. CONTENU - Ce qui a été généré
-- ============================================

-- Articles blog
SELECT
  '📝 ARTICLES' as "Type",
  COUNT(*) as "Total",
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as "Cette semaine"
FROM blog_posts
WHERE true; -- Évite l'erreur si table vide

-- Pages villes
SELECT
  '🏙️ VILLES' as "Type",
  COUNT(*) as "Total",
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as "Cette semaine"
FROM city_pages
WHERE true;

-- FAQ
SELECT
  '❓ FAQ' as "Type",
  COUNT(*) as "Total",
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as "Cette semaine"
FROM faq
WHERE true;

-- Posts sociaux
SELECT
  '📱 SOCIAL' as "Type",
  COUNT(*) as "Total",
  COUNT(*) FILTER (WHERE status = 'published') as "Publiés"
FROM social_posts
WHERE true;

-- ============================================
-- 3. DONNÉES SEO
-- ============================================
SELECT
  '📊 SEO' as "Type",
  COUNT(*) as "Nombre de métriques",
  MAX(date) as "Dernière sync"
FROM seo_metrics
WHERE true;

-- ============================================
-- 4. RÉSUMÉ GLOBAL
-- ============================================
SELECT
  '✅ STATUT' as "Section",
  CASE
    WHEN (SELECT COUNT(*) FROM cron.job WHERE active = true) = 0 THEN 'CRON JOBS INACTIFS'
    WHEN (SELECT COUNT(*) FROM blog_posts WHERE created_at > NOW() - INTERVAL '7 days') = 0 THEN 'PAS DE NOUVEAU CONTENU'
    ELSE 'TOUT FONCTIONNE'
  END as "État",
  NOW() as "Date du diagnostic";

-- ============================================
-- 5. PROCHAINES ÉTAPES
-- ============================================
SELECT
  '🎯 ACTIONS' as "Section",
  CASE
    WHEN (SELECT COUNT(*) FROM cron.job WHERE active = true) = 0 THEN 'Appliquer la migration 20251022100000'
    WHEN (SELECT COUNT(*) FROM blog_posts WHERE created_at > NOW() - INTERVAL '7 days') = 0 THEN 'Configurer les secrets API'
    ELSE 'Attendre 24h pour voir le contenu'
  END as "À faire maintenant";
