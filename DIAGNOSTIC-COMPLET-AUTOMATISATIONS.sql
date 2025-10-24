-- ============================================================================
-- DIAGNOSTIC COMPLET : Données SEO + Automatisations
-- ============================================================================

-- 1. VÉRIFIER LES VRAIES DONNÉES SEO
SELECT 
  'DONNÉES SEO' as section,
  COUNT(*) as total_lignes,
  COUNT(DISTINCT url) as urls_distinctes,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  MIN(date) as date_min,
  MAX(date) as date_max,
  MAX(created_at) as derniere_synchro
FROM seo_metrics;

-- 2. VÉRIFIER SI CE SONT DES DONNÉES DE TEST
SELECT 
  'ANALYSE DONNÉES' as section,
  url,
  impressions,
  clicks,
  position,
  date,
  created_at
FROM seo_metrics
ORDER BY created_at DESC
LIMIT 10;

-- 3. VÉRIFIER LES CRON JOBS ACTIFS
SELECT 
  'CRON JOBS ACTIFS' as section,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE active = true
ORDER BY jobname;

-- 4. VÉRIFIER LES DERNIERS ARTICLES BLOG GÉNÉRÉS
SELECT 
  'ARTICLES BLOG' as section,
  title,
  published,
  featured_image,
  created_at
FROM blog_posts
ORDER BY created_at DESC
LIMIT 5;

-- 5. VÉRIFIER LES DERNIÈRES FAQ GÉNÉRÉES
SELECT 
  'FAQ GÉNÉRÉES' as section,
  question,
  published,
  created_at
FROM faq
ORDER BY created_at DESC
LIMIT 5;

-- 6. VÉRIFIER LES DERNIÈRES VILLES GÉNÉRÉES
SELECT 
  'VILLES GÉNÉRÉES' as section,
  city,
  slug,
  hero_title,
  created_at
FROM city_pages
ORDER BY created_at DESC
LIMIT 5;

-- 7. VÉRIFIER LES POSTS RÉSEAUX SOCIAUX
SELECT 
  'POSTS SOCIAUX' as section,
  platform,
  content_type,
  status,
  scheduled_for,
  created_at
FROM social_posts
ORDER BY created_at DESC
LIMIT 5;

-- 8. VÉRIFIER LES LOGS D'AUTOMATISATION
SELECT 
  'LOGS AUTOMATISATIONS' as section,
  automation_name,
  status,
  error_message,
  execution_time,
  created_at
FROM automation_logs
ORDER BY created_at DESC
LIMIT 10;
