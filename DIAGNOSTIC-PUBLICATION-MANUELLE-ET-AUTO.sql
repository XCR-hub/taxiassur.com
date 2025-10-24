/*
  # DIAGNOSTIC COMPLET - Publication Manuelle vs Automatisée

  Vérifie que les deux systèmes fonctionnent:
  1. Publication manuelle (backoffice/ai-generator)
  2. Publication automatisée (cron job daily blog)
*/

-- ========================================
-- 1. VÉRIFIER L'EDGE FUNCTION
-- ========================================
SELECT
  '🔍 Edge Function generate-seo-content' AS verification,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_stat_ssl
      WHERE ssl = true
    ) THEN '✅ Connexion SSL active (Edge Function accessible)'
    ELSE '⚠️ Vérifier le déploiement de l''Edge Function'
  END AS status;

-- ========================================
-- 2. STRUCTURE DES TABLES DE PUBLICATION
-- ========================================
SELECT
  '📊 Structure blog_posts' AS verification,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'blog_posts'
  AND column_name IN ('slug', 'title', 'content', 'excerpt', 'meta_description', 'featured_image', 'image_alt', 'published', 'author')
ORDER BY ordinal_position;

SELECT
  '📊 Structure city_pages' AS verification,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'city_pages'
  AND column_name IN ('city', 'slug', 'title', 'content', 'dept', 'region', 'population', 'taxi_count', 'status')
ORDER BY ordinal_position;

SELECT
  '📊 Structure faq_entries' AS verification,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'faq_entries'
  AND column_name IN ('question', 'answer', 'category', 'order_index', 'published')
ORDER BY ordinal_position;

-- ========================================
-- 3. VÉRIFIER LES RLS POLICIES (PUBLICATION MANUELLE)
-- ========================================
SELECT
  '🔒 RLS Policies blog_posts' AS verification,
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual::text AS using_clause
FROM pg_policies
WHERE tablename = 'blog_posts'
ORDER BY policyname;

SELECT
  '🔒 RLS Policies city_pages' AS verification,
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'city_pages'
ORDER BY policyname;

SELECT
  '🔒 RLS Policies faq_entries' AS verification,
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'faq_entries'
ORDER BY policyname;

-- ========================================
-- 4. VÉRIFIER LA FONCTION CRON
-- ========================================
SELECT
  '⚙️ Fonction generate_daily_blog_post' AS verification,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'generate_daily_blog_post'
LIMIT 1;

-- ========================================
-- 5. VÉRIFIER LE CRON JOB BLOG
-- ========================================
SELECT
  '⏰ Cron Job Blog Automatique' AS verification,
  jobid,
  jobname,
  schedule,
  command,
  active,
  nodename
FROM cron.job
WHERE jobname LIKE '%blog%' OR jobname LIKE '%daily%'
ORDER BY jobname;

-- ========================================
-- 6. DERNIÈRES EXÉCUTIONS CRON
-- ========================================
SELECT
  '📝 Dernières exécutions cron (blog)' AS verification,
  id,
  job_name,
  status,
  created_count,
  error_message,
  execution_time_ms,
  details->>'ai_generated' AS ai_generated,
  details->>'content_length' AS content_length,
  created_at
FROM cron_execution_log
WHERE job_name LIKE '%blog%'
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- 7. DERNIERS ARTICLES PUBLIÉS
-- ========================================
SELECT
  '📰 Derniers articles blog publiés' AS verification,
  id,
  title,
  slug,
  LENGTH(content) AS content_length,
  featured_image IS NOT NULL AS has_image,
  image_alt,
  published,
  author,
  created_at
FROM blog_posts
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- 8. TEST MANUEL DE GÉNÉRATION
-- ========================================
-- NE PAS EXÉCUTER AUTOMATIQUEMENT, JUSTE POUR RÉFÉRENCE
/*
-- Test 1: Appel manuel de la fonction (simule le cron)
SELECT generate_daily_blog_post();

-- Test 2: Vérifier le résultat
SELECT
  title,
  slug,
  LENGTH(content) AS content_length,
  featured_image,
  created_at
FROM blog_posts
ORDER BY created_at DESC
LIMIT 1;
*/

-- ========================================
-- 9. VÉRIFIER LES VARIABLES D'ENVIRONNEMENT
-- ========================================
SELECT
  '🔑 Variables d''environnement Supabase' AS verification,
  CASE
    WHEN current_setting('app.settings.supabase_url', true) IS NOT NULL
    THEN '✅ SUPABASE_URL configurée'
    ELSE '❌ SUPABASE_URL manquante'
  END AS supabase_url_status,
  CASE
    WHEN current_setting('app.settings.supabase_service_role_key', true) IS NOT NULL
    THEN '✅ SERVICE_ROLE_KEY configurée'
    ELSE '❌ SERVICE_ROLE_KEY manquante'
  END AS service_key_status;

-- ========================================
-- 10. RÉSUMÉ FINAL
-- ========================================
WITH stats AS (
  SELECT
    COUNT(*) AS total_articles,
    COUNT(*) FILTER (WHERE featured_image IS NOT NULL) AS articles_with_images,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS articles_last_7_days,
    COUNT(*) FILTER (WHERE published = true) AS published_articles
  FROM blog_posts
)
SELECT
  '📊 RÉSUMÉ' AS section,
  total_articles || ' articles totaux' AS metric_1,
  articles_with_images || ' avec images' AS metric_2,
  articles_last_7_days || ' créés cette semaine' AS metric_3,
  published_articles || ' publiés' AS metric_4
FROM stats;

-- ========================================
-- 11. DIAGNOSTIC DE PROBLÈMES POTENTIELS
-- ========================================
SELECT
  '⚠️ DIAGNOSTIC' AS section,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%blog%')
    THEN '❌ CRITIQUE: Aucun cron job blog trouvé'
    WHEN NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%blog%' AND active = true)
    THEN '❌ CRITIQUE: Cron job blog désactivé'
    WHEN NOT EXISTS (SELECT 1 FROM cron_execution_log WHERE job_name LIKE '%blog%' AND created_at > NOW() - INTERVAL '2 days')
    THEN '⚠️ WARNING: Aucune exécution récente (2 derniers jours)'
    WHEN EXISTS (SELECT 1 FROM cron_execution_log WHERE job_name LIKE '%blog%' AND status = 'error' AND created_at > NOW() - INTERVAL '1 day')
    THEN '⚠️ WARNING: Erreurs détectées dans les dernières 24h'
    ELSE '✅ OK: Système opérationnel'
  END AS diagnostic;

-- ========================================
-- 12. RECOMMENDATIONS
-- ========================================
SELECT
  '💡 RECOMMENDATIONS' AS section,
  recommendation
FROM (
  VALUES
    ('1. Vérifier que l''Edge Function generate-seo-content est déployée sur Supabase'),
    ('2. Tester manuellement: SELECT generate_daily_blog_post();'),
    ('3. Vérifier les logs cron: SELECT * FROM cron_execution_log ORDER BY created_at DESC LIMIT 10;'),
    ('4. Publication manuelle: utiliser l''interface backoffice/ai-generator'),
    ('5. Si erreur 401/403: vérifier les RLS policies (anon doit pouvoir INSERT sur blog_posts)'),
    ('6. Si pas d''image: vérifier que PEXELS_API_KEY est configurée dans Supabase'),
    ('7. Si erreur OpenAI: vérifier que OPENAI_API_KEY est configurée dans Supabase')
) AS t(recommendation);
