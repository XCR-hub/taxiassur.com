-- ══════════════════════════════════════════════════════════════════
--  DIAGNOSTIC: SCRAPING AUTOMATIQUE BACKLINKS
-- ══════════════════════════════════════════════════════════════════

-- 1) Vérifier les cron jobs de scraping
SELECT 
  '🔍 CRON JOBS SCRAPING' as section,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✅ ACTIF'
    ELSE '❌ INACTIF'
  END as status
FROM cron.job
WHERE jobname LIKE '%backlink%' OR jobname LIKE '%scan%'
ORDER BY jobname;

-- 2) Vérifier quand les opportunités ont été créées
SELECT 
  '📅 HISTORIQUE CRÉATION' as section,
  DATE(created_at) as date_creation,
  COUNT(*) as nb_opportunites,
  MIN(created_at)::time as premiere_heure,
  MAX(created_at)::time as derniere_heure
FROM backlink_opportunities
GROUP BY DATE(created_at)
ORDER BY date_creation DESC;

-- 3) Vérifier les fonctions de scraping
SELECT 
  '⚙️ FONCTIONS SCRAPING' as section,
  routine_name as fonction,
  routine_type as type,
  CASE 
    WHEN routine_name LIKE '%scrape%' THEN '✅ Scraping'
    WHEN routine_name LIKE '%scan%' THEN '✅ Scanning'
    ELSE '❓ Autre'
  END as categorie
FROM information_schema.routines
WHERE routine_name LIKE '%scrape%' 
   OR routine_name LIKE '%scan%backlink%'
   OR routine_name LIKE '%find%backlink%'
ORDER BY routine_name;

-- 4) Vérifier les edge functions déployées
SELECT 
  '🚀 EDGE FUNCTIONS' as section,
  'scan-backlinks' as fonction,
  'Scrape nouveaux sites pour backlinks' as description,
  'Vérifier dans Supabase Edge Functions' as verifier;

-- 5) Tester si toutes les opportunités ont été créées en même temps
SELECT 
  '⏰ PATTERN CRÉATION' as section,
  CASE 
    WHEN MAX(created_at) - MIN(created_at) < INTERVAL '5 minutes' THEN 
      '⚠️ TOUTES CRÉÉES EN MÊME TEMPS (manuel)'
    WHEN MAX(created_at) - MIN(created_at) > INTERVAL '1 day' THEN
      '✅ CRÉATION ÉTALÉE (automatique)'
    ELSE
      '❓ PATTERN MIXTE'
  END as pattern,
  COUNT(*) as total_opportunites,
  MIN(created_at) as premiere_creation,
  MAX(created_at) as derniere_creation,
  MAX(created_at) - MIN(created_at) as ecart_temps
FROM backlink_opportunities;

-- 6) Vérifier les sources d'opportunités
SELECT 
  '📊 SOURCES' as section,
  COALESCE(metadata->>'source', 'manuel') as source,
  COUNT(*) as nombre,
  MIN(created_at) as premiere,
  MAX(created_at) as derniere
FROM backlink_opportunities
GROUP BY metadata->>'source'
ORDER BY nombre DESC;

-- RÉSUMÉ FINAL
SELECT 
  '═══════════════════════════════════════' as separateur,
  '' as vide;

SELECT 
  '📋 RÉSUMÉ' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM cron.job 
      WHERE (jobname LIKE '%backlink%' OR jobname LIKE '%scan%') 
      AND active = true
    ) THEN '✅ Cron job scraping actif'
    ELSE '❌ Aucun cron job scraping actif'
  END as cron_status;

SELECT 
  '📋 RÉSUMÉ' as section,
  CASE 
    WHEN MAX(created_at) - MIN(created_at) < INTERVAL '5 minutes' THEN 
      '❌ Scraping automatique NON actif (tout créé manuellement)'
    ELSE
      '✅ Scraping automatique probablement actif'
  END as scraping_status
FROM backlink_opportunities;
