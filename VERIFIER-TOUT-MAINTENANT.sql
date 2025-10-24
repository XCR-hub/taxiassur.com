/*
  # VÉRIFICATION RAPIDE - 30 SECONDES

  Exécuter ce script pour tout vérifier d'un coup
*/

-- ========================================
-- 1. EDGE FUNCTION DÉPLOYÉE ?
-- ========================================
\echo '🔍 1. EDGE FUNCTION generate-seo-content'
\echo 'Vérifier manuellement dans Supabase Dashboard > Edge Functions'
\echo 'Doit être "Deployed" avec statut vert'
\echo ''

-- ========================================
-- 2. TABLES OK ?
-- ========================================
\echo '📊 2. TABLES DE PUBLICATION'
SELECT
  'blog_posts' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE featured_image IS NOT NULL) AS with_images,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h
FROM blog_posts
UNION ALL
SELECT
  'city_pages' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE status = 'published') AS with_images,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h
FROM city_pages
UNION ALL
SELECT
  'faq_entries' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE published = true) AS with_images,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h
FROM faq_entries;

\echo ''

-- ========================================
-- 3. RLS POLICIES OK ?
-- ========================================
\echo '🔒 3. RLS POLICIES (authentifié doit pouvoir INSERT)'
SELECT
  tablename,
  policyname,
  roles::text,
  cmd
FROM pg_policies
WHERE tablename IN ('blog_posts', 'city_pages', 'faq_entries')
  AND (roles::text LIKE '%authenticated%' OR roles::text LIKE '%anon%')
  AND cmd IN ('INSERT', 'ALL')
ORDER BY tablename, policyname;

\echo ''

-- ========================================
-- 4. FONCTION CRON OK ?
-- ========================================
\echo '⚙️ 4. FONCTION generate_daily_blog_post'
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_daily_blog_post')
    THEN '✅ Fonction existe'
    ELSE '❌ Fonction manquante'
  END AS status;

\echo ''

-- ========================================
-- 5. CRON JOB ACTIF ?
-- ========================================
\echo '⏰ 5. CRON JOB BLOG'
SELECT
  jobname,
  schedule,
  active,
  CASE
    WHEN active = true THEN '✅ Actif'
    ELSE '❌ Désactivé'
  END AS status
FROM cron.job
WHERE jobname LIKE '%blog%' OR jobname LIKE '%daily%';

\echo ''

-- ========================================
-- 6. DERNIÈRE EXÉCUTION CRON
-- ========================================
\echo '📝 6. DERNIÈRE EXÉCUTION CRON'
SELECT
  job_name,
  status,
  created_count,
  error_message,
  details->>'ai_generated' AS ai_generated,
  details->>'content_length' AS content_length,
  created_at,
  CASE
    WHEN status = 'success' AND created_count > 0 THEN '✅ OK'
    WHEN status = 'error' THEN '❌ Erreur: ' || error_message
    ELSE '⚠️ Statut: ' || status
  END AS diagnostic
FROM cron_execution_log
WHERE job_name LIKE '%blog%'
ORDER BY created_at DESC
LIMIT 1;

\echo ''

-- ========================================
-- 7. DERNIER ARTICLE CRÉÉ
-- ========================================
\echo '📰 7. DERNIER ARTICLE PUBLIÉ'
SELECT
  title,
  LENGTH(content) AS content_length,
  featured_image IS NOT NULL AS has_image,
  published,
  created_at,
  CASE
    WHEN featured_image IS NOT NULL AND LENGTH(content) > 2000 THEN '✅ Article complet IA'
    WHEN LENGTH(content) > 500 THEN '⚠️ Article fallback'
    ELSE '❌ Article incomplet'
  END AS quality
FROM blog_posts
ORDER BY created_at DESC
LIMIT 1;

\echo ''

-- ========================================
-- 8. VARIABLES D'ENVIRONNEMENT
-- ========================================
\echo '🔑 8. VARIABLES D''ENVIRONNEMENT'
SELECT
  CASE
    WHEN current_setting('app.settings.supabase_url', true) IS NOT NULL
    THEN '✅ SUPABASE_URL configurée'
    ELSE '❌ SUPABASE_URL manquante - Voir instructions ci-dessous'
  END AS supabase_url_status,
  CASE
    WHEN current_setting('app.settings.supabase_service_role_key', true) IS NOT NULL
    THEN '✅ SERVICE_ROLE_KEY configurée'
    ELSE '❌ SERVICE_ROLE_KEY manquante - Voir instructions ci-dessous'
  END AS service_key_status;

\echo ''
\echo 'Si variables manquantes, exécuter:'
\echo 'ALTER DATABASE postgres SET app.settings.supabase_url = ''https://drohhxrkoequjphvabvq.supabase.co'';'
\echo 'ALTER DATABASE postgres SET app.settings.supabase_service_role_key = ''YOUR_SERVICE_KEY'';'
\echo ''

-- ========================================
-- 9. DIAGNOSTIC FINAL
-- ========================================
\echo '🎯 9. DIAGNOSTIC FINAL'
WITH checks AS (
  SELECT
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_daily_blog_post') AS has_function,
    EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%blog%' AND active = true) AS has_active_cron,
    EXISTS (SELECT 1 FROM cron_execution_log WHERE job_name LIKE '%blog%' AND status = 'success' AND created_at > NOW() - INTERVAL '2 days') AS has_recent_success,
    EXISTS (SELECT 1 FROM blog_posts WHERE created_at > NOW() - INTERVAL '24 hours') AS has_recent_articles,
    current_setting('app.settings.supabase_url', true) IS NOT NULL AS has_supabase_url
)
SELECT
  CASE
    WHEN has_function AND has_active_cron AND has_recent_success AND has_recent_articles AND has_supabase_url
    THEN '✅ SYSTÈME 100% OPÉRATIONNEL'
    WHEN has_function AND has_active_cron AND has_supabase_url
    THEN '⚠️ SYSTÈME OK - Attendre première exécution automatique'
    WHEN has_function AND has_active_cron
    THEN '⚠️ Variables d''environnement manquantes (URL/SERVICE_KEY)'
    WHEN has_function
    THEN '❌ Cron job désactivé ou manquant'
    ELSE '❌ Fonction generate_daily_blog_post manquante'
  END AS diagnostic,
  CASE
    WHEN NOT has_function THEN 'Exécuter la migration 20251024014000_fix_blog_and_connect_full_ai.sql'
    WHEN NOT has_active_cron THEN 'Recréer le cron job avec: SELECT cron.schedule(...)'
    WHEN NOT has_supabase_url THEN 'Configurer les variables d''environnement (voir ci-dessus)'
    WHEN NOT has_recent_success THEN 'Tester manuellement: SELECT generate_daily_blog_post();'
    ELSE '🎉 Tout fonctionne ! Tester maintenant sur https://taxiassur.com/backoffice/ai-generator'
  END AS action_recommandee
FROM checks;

\echo ''

-- ========================================
-- 10. NEXT STEPS
-- ========================================
\echo '💡 10. PROCHAINES ÉTAPES'
\echo ''
\echo 'PUBLICATION MANUELLE:'
\echo '1. Aller sur: https://taxiassur.com/backoffice/ai-generator'
\echo '2. Remplir: Mot-clé + Ville'
\echo '3. Cliquer: "Générer TOUT le Contenu"'
\echo '4. Attendre 30-60 secondes'
\echo '5. Cliquer: "Publier TOUT"'
\echo ''
\echo 'PUBLICATION AUTOMATIQUE:'
\echo '1. Tester: SELECT generate_daily_blog_post();'
\echo '2. Vérifier logs: SELECT * FROM cron_execution_log ORDER BY created_at DESC LIMIT 5;'
\echo '3. Le cron s''exécutera automatiquement selon le schedule configuré'
\echo ''
\echo '✅ Voir TEST-COMPLET-PUBLICATION.md pour guide détaillé'
