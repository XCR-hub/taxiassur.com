-- ============================================================================
-- DIAGNOSTIC COMPLET DE LA BASE DE DONNÉES
-- À exécuter dans Supabase SQL Editor
-- ============================================================================

-- 1. Vérifier le contenu des tables principales
SELECT '=== BLOG POSTS ===' as section;
SELECT COUNT(*) as total_blog_posts,
       COUNT(*) FILTER (WHERE published = true) as published_posts,
       COUNT(*) FILTER (WHERE featured_image IS NOT NULL) as posts_with_images
FROM blog_posts;

SELECT '=== FAQ ENTRIES ===' as section;
SELECT COUNT(*) as total_faq FROM faq_entries;
SELECT * FROM faq_entries LIMIT 3;

SELECT '=== CITY PAGES ===' as section;
SELECT COUNT(*) as total_city_pages,
       COUNT(*) FILTER (WHERE status = 'published') as published_pages
FROM city_pages;

SELECT '=== NEWS ARTICLES ===' as section;
SELECT COUNT(*) as total_news,
       COUNT(*) FILTER (WHERE status = 'published') as published_news
FROM news_articles;

SELECT '=== LEADS ===' as section;
SELECT COUNT(*) as total_leads,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_leads
FROM leads;

SELECT '=== TAXI PROSPECTS ===' as section;
SELECT COUNT(*) as total_prospects,
       COUNT(*) FILTER (WHERE status = 'new') as new_prospects,
       COUNT(*) FILTER (WHERE email IS NOT NULL) as prospects_with_email
FROM taxi_prospects;

-- 2. Tester les fonctions RPC
SELECT '=== TEST get_ai_master_dashboard ===' as section;
SELECT * FROM get_ai_master_dashboard();

SELECT '=== TEST get_system_health ===' as section;
SELECT * FROM get_system_health();

SELECT '=== TEST get_faq_entries ===' as section;
SELECT COUNT(*) as faq_count FROM get_faq_entries();

-- 3. Vérifier les cron jobs
SELECT '=== CRON JOBS STATUS ===' as section;
SELECT
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname LIKE '%seo%' OR jobname LIKE '%content%' OR jobname LIKE '%blog%'
ORDER BY jobname;

-- 4. Vérifier l'état de l'IA Maître
SELECT '=== AI MASTER STATUS ===' as section;
SELECT
  is_active,
  mode,
  global_health,
  system_checks,
  last_update
FROM ai_master_status
ORDER BY created_at DESC
LIMIT 1;

-- 5. Dernières exécutions des automatisations
SELECT '=== SEO AUTOMATION CONFIG ===' as section;
SELECT
  key,
  value->>'enabled' as enabled,
  last_executed_at,
  next_execution_at
FROM seo_automation_config
WHERE key IN ('daily_metrics_refresh', 'auto_ping_on_publish')
ORDER BY key;

SELECT '✅ Diagnostic terminé' as status;
