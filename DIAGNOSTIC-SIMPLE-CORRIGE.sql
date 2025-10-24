-- ============================================================================
-- DIAGNOSTIC SIMPLIFIÉ ET CORRIGÉ
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

-- 2. EXAMINER QUELQUES LIGNES DE DONNÉES SEO
SELECT 
  'EXEMPLE DONNÉES SEO' as section,
  url,
  impressions,
  clicks,
  position,
  date,
  created_at
FROM seo_metrics
ORDER BY created_at DESC
LIMIT 5;

-- 3. VÉRIFIER LES CRON JOBS ACTIFS
SELECT 
  'CRON JOBS ACTIFS' as section,
  jobname,
  schedule,
  active
FROM cron.job
WHERE active = true
ORDER BY jobname;

-- 4. COMPTER LES CRON JOBS
SELECT 
  'TOTAL CRON JOBS' as section,
  COUNT(*) FILTER (WHERE active = true) as actifs,
  COUNT(*) FILTER (WHERE active = false) as inactifs,
  COUNT(*) as total
FROM cron.job;

-- 5. VÉRIFIER LES DERNIERS ARTICLES BLOG
SELECT 
  'ARTICLES BLOG' as section,
  title,
  published,
  created_at,
  CASE 
    WHEN featured_image IS NOT NULL THEN 'OUI'
    ELSE 'NON'
  END as a_image
FROM blog_posts
ORDER BY created_at DESC
LIMIT 5;

-- 6. VÉRIFIER LES DERNIÈRES FAQ
SELECT 
  'FAQ' as section,
  question,
  published,
  created_at
FROM faq
ORDER BY created_at DESC
LIMIT 5;

-- 7. VÉRIFIER LES DERNIÈRES VILLES
SELECT 
  'VILLES' as section,
  city,
  slug,
  created_at
FROM city_pages
ORDER BY created_at DESC
LIMIT 5;

-- 8. VÉRIFIER STRUCTURE automation_logs (si elle existe)
SELECT 
  'STRUCTURE automation_logs' as section,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'automation_logs'
ORDER BY ordinal_position;

-- 9. SI automation_logs existe, voir les dernières entrées
SELECT 
  'LOGS' as section,
  *
FROM automation_logs
ORDER BY created_at DESC
LIMIT 5;
