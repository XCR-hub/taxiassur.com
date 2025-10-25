-- ============================================================================
-- TEST DES FONCTIONS SUPABASE - COPIEZ-COLLEZ DANS SQL EDITOR
-- ============================================================================
-- Exécutez ce fichier après avoir exécuté FIX-PERMISSION-ET-RECUPERATION-DONNEES-V2.sql
-- pour vérifier que tout fonctionne correctement

-- Test 1 : Vérifier la table cron_config
SELECT '========================================' as test;
SELECT '✓ TEST 1 : Configuration Cron' as test;
SELECT '========================================' as test;
SELECT * FROM public.cron_config;

-- Test 2 : Récupérer la configuration
SELECT '========================================' as test;
SELECT '✓ TEST 2 : Fonction get_cron_config' as test;
SELECT '========================================' as test;
SELECT
  'supabase_url' as config_key,
  get_cron_config('supabase_url') as config_value
UNION ALL
SELECT
  'service_role_key' as config_key,
  LEFT(get_cron_config('service_role_key'), 50) || '...' as config_value;

-- Test 3 : Compter les articles de blog
SELECT '========================================' as test;
SELECT '✓ TEST 3 : Articles de blog' as test;
SELECT '========================================' as test;
SELECT COUNT(*) as total_blog_posts FROM blog_posts;
SELECT COUNT(*) as published_blog_posts FROM blog_posts WHERE published = true;

-- Test 4 : Récupérer 5 articles de blog avec la fonction
SELECT '========================================' as test;
SELECT '✓ TEST 4 : Fonction get_blog_posts' as test;
SELECT '========================================' as test;
SELECT
  title,
  slug,
  category,
  views,
  published
FROM get_blog_posts(5, 0);

-- Test 5 : Compter les actualités
SELECT '========================================' as test;
SELECT '✓ TEST 5 : Actualités' as test;
SELECT '========================================' as test;
SELECT COUNT(*) as total_news FROM news;
SELECT COUNT(*) as published_news FROM news WHERE COALESCE(published, true) = true;

-- Test 6 : Récupérer 3 actualités avec la fonction
SELECT '========================================' as test;
SELECT '✓ TEST 6 : Fonction get_news' as test;
SELECT '========================================' as test;
SELECT
  title,
  slug,
  category,
  views
FROM get_news(3, 0);

-- Test 7 : Compter les FAQs
SELECT '========================================' as test;
SELECT '✓ TEST 7 : FAQs' as test;
SELECT '========================================' as test;
SELECT COUNT(*) as total_faqs FROM faq;

-- Test 8 : Récupérer toutes les FAQs avec la fonction
SELECT '========================================' as test;
SELECT '✓ TEST 8 : Fonction get_faqs' as test;
SELECT '========================================' as test;
SELECT
  question,
  category,
  views,
  helpful_count
FROM get_faqs();

-- Test 9 : Compter les leads
SELECT '========================================' as test;
SELECT '✓ TEST 9 : Leads' as test;
SELECT '========================================' as test;
SELECT COUNT(*) as total_leads FROM leads;
SELECT
  status,
  COUNT(*) as count
FROM leads
GROUP BY status
ORDER BY count DESC;

-- Test 10 : Récupérer 5 leads avec la fonction (nécessite authentification)
SELECT '========================================' as test;
SELECT '✓ TEST 10 : Fonction get_leads' as test;
SELECT '========================================' as test;
SELECT
  first_name,
  last_name,
  city,
  vehicle_type,
  status,
  created_at::date as date_creation
FROM get_leads(NULL, 5, 0);

-- Test 11 : Récupérer les statistiques complètes
SELECT '========================================' as test;
SELECT '✓ TEST 11 : Fonction get_dashboard_stats' as test;
SELECT '========================================' as test;
SELECT jsonb_pretty(get_dashboard_stats()) as dashboard_stats;

-- Test 12 : Rechercher dans le contenu
SELECT '========================================' as test;
SELECT '✓ TEST 12 : Fonction search_content' as test;
SELECT '========================================' as test;
SELECT
  type,
  title,
  slug,
  relevance
FROM search_content('assurance taxi', 'all')
LIMIT 5;

-- Test 13 : Vérifier les permissions
SELECT '========================================' as test;
SELECT '✓ TEST 13 : Vérification des permissions' as test;
SELECT '========================================' as test;
SELECT
  routine_name as fonction,
  routine_type as type,
  security_type as securite
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'get_%'
ORDER BY routine_name;

-- Test 14 : Vérifier les politiques RLS
SELECT '========================================' as test;
SELECT '✓ TEST 14 : Vérification RLS' as test;
SELECT '========================================' as test;
SELECT
  tablename as table_name,
  policyname as policy_name,
  permissive,
  roles,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test 15 : Résumé final
SELECT '========================================' as test;
SELECT '✅ RÉSUMÉ FINAL' as test;
SELECT '========================================' as test;
SELECT
  'Blog Posts' as type_donnees,
  (SELECT COUNT(*) FROM blog_posts WHERE published = true) as nombre
UNION ALL
SELECT
  'News' as type_donnees,
  (SELECT COUNT(*) FROM news WHERE COALESCE(published, true) = true) as nombre
UNION ALL
SELECT
  'FAQs' as type_donnees,
  (SELECT COUNT(*) FROM faq) as nombre
UNION ALL
SELECT
  'Leads' as type_donnees,
  (SELECT COUNT(*) FROM leads) as nombre
UNION ALL
SELECT
  'Fonctions RPC' as type_donnees,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'get_%') as nombre;

-- Message final
SELECT '========================================' as test;
SELECT '🎉 TOUS LES TESTS SONT TERMINÉS !' as test;
SELECT '========================================' as test;
SELECT 'Si vous voyez ce message, toutes les fonctions sont opérationnelles !' as message;
SELECT 'Vous pouvez maintenant utiliser /backoffice/data dans votre application.' as message;
SELECT '========================================' as test;
