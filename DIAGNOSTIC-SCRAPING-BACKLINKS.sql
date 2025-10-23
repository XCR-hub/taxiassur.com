-- ══════════════════════════════════════════════════════════════════
--  DIAGNOSTIC COMPLET: POURQUOI LE SCRAPING NE FONCTIONNE PAS?
-- ══════════════════════════════════════════════════════════════════

-- 1️⃣ VÉRIFIER SI LE CRON A BIEN ÉTÉ EXÉCUTÉ
SELECT 
  '1️⃣ CRON JOBS BACKLINKS' as section,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%backlink%' OR jobname LIKE '%scan%';

-- 2️⃣ VÉRIFIER HISTORIQUE DES SCANS
SELECT 
  '2️⃣ HISTORIQUE SCANS' as section,
  COUNT(*) as total_scans,
  MAX(created_at) as dernier_scan,
  COUNT(*) FILTER (WHERE status = 'success') as scans_reussis,
  COUNT(*) FILTER (WHERE status = 'failed') as scans_echec
FROM backlink_scan_history;

-- 3️⃣ DÉTAILS DES DERNIERS SCANS
SELECT 
  '3️⃣ DERNIERS SCANS (5)' as section,
  id,
  status,
  opportunities_found,
  competitors_scanned,
  scan_duration_ms,
  error_message,
  created_at
FROM backlink_scan_history
ORDER BY created_at DESC
LIMIT 5;

-- 4️⃣ VÉRIFIER EDGE FUNCTION SCAN-BACKLINKS
SELECT 
  '4️⃣ EDGE FUNCTIONS' as section,
  'Vérifier manuellement:' as info,
  'Supabase → Edge Functions → scan-backlinks' as lien,
  'Doit être déployée et active' as status_requis;

-- 5️⃣ VÉRIFIER SECRETS/API KEYS
SELECT 
  '5️⃣ CONFIGURATION API' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'GOOGLE_CSE_API_KEY') 
    THEN '✅ GOOGLE_CSE_API_KEY présente'
    ELSE '❌ GOOGLE_CSE_API_KEY manquante (scraping en mode démo)'
  END as google_cse_key,
  CASE 
    WHEN EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'GOOGLE_CSE_CX_ID') 
    THEN '✅ GOOGLE_CSE_CX_ID présente'
    ELSE '❌ GOOGLE_CSE_CX_ID manquante'
  END as google_cse_cx,
  CASE 
    WHEN EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'HUNTER_IO_API_KEY') 
    THEN '✅ HUNTER_IO_API_KEY présente'
    ELSE '⚠️ HUNTER_IO_API_KEY manquante (emails limités)'
  END as hunter_io;

-- 6️⃣ VÉRIFIER EXTENSION HTTP
SELECT 
  '6️⃣ EXTENSION HTTP' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_available_extensions 
      WHERE name = 'http' AND installed_version IS NOT NULL
    )
    THEN '✅ Extension http installée'
    ELSE '❌ Extension http manquante (net.http_post ne fonctionnera pas)'
  END as status_http;

-- 7️⃣ VÉRIFIER LES OPPORTUNITÉS EXISTANTES
SELECT 
  '7️⃣ OPPORTUNITÉS ACTUELLES' as section,
  COUNT(*) as total,
  COUNT(DISTINCT domain) as domaines_uniques,
  MIN(created_at) as premiere_opportunite,
  MAX(created_at) as derniere_opportunite
FROM backlink_opportunities;

-- 8️⃣ TESTER MANUELLEMENT L'EDGE FUNCTION
SELECT 
  '8️⃣ TEST MANUEL EDGE FUNCTION' as section,
  'Copier-coller cette commande:' as action;

-- Commande pour tester manuellement
SELECT 
  '📋 COMMANDE TEST' as info,
  $test$
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scan-backlinks',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
  ),
  body := jsonb_build_object(
    'competitors', ARRAY['mfa.fr', 'april-moto.com', 'axa.fr']
  )
);
$test$ as commande_test;

-- 9️⃣ RÉSUMÉ DIAGNOSTIC
SELECT '═══════════════════════════════════════════════════' as separateur;

SELECT 
  '📋 DIAGNOSTIC AUTOMATIQUE' as titre,
  CASE 
    -- Cas 1: Pas de cron job
    WHEN NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%backlink%') THEN
      '❌ Aucun cron job backlinks configuré → Exécuter ACTIVER-SCRAPING-BACKLINKS-AUTO-V2.sql'
    
    -- Cas 2: Cron job désactivé
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%backlink%' AND active = false) THEN
      '⚠️ Cron job désactivé → L''activer dans cron.job'
    
    -- Cas 3: Pas d'historique de scan
    WHEN NOT EXISTS (SELECT 1 FROM backlink_scan_history) THEN
      '❌ Aucun scan exécuté → Le cron n''a jamais appelé l''edge function'
    
    -- Cas 4: Derniers scans en échec
    WHEN EXISTS (
      SELECT 1 FROM backlink_scan_history 
      WHERE status = 'failed' 
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN
      '❌ Dernier scan en erreur → Voir error_message ci-dessus'
    
    -- Cas 5: Scans OK mais 0 opportunités
    WHEN EXISTS (
      SELECT 1 FROM backlink_scan_history 
      WHERE status = 'success' AND opportunities_found = 0
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN
      '⚠️ Scans OK mais 0 nouvelles opportunités → API Google CSE manquante OU tous les sites déjà en base'
    
    -- Cas 6: Tout OK
    WHEN EXISTS (
      SELECT 1 FROM backlink_scan_history 
      WHERE status = 'success' AND opportunities_found > 0
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN
      '✅ Système fonctionne! Derniers scans ont trouvé de nouveaux sites'
    
    ELSE '❓ Statut inconnu - vérifier manuellement'
  END as diagnostic,
  
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%backlink%') THEN
      'Créer le cron job de scraping'
    WHEN NOT EXISTS (SELECT 1 FROM backlink_scan_history) THEN
      'Tester manuellement l''edge function scan-backlinks'
    WHEN EXISTS (SELECT 1 FROM backlink_scan_history WHERE status = 'failed' ORDER BY created_at DESC LIMIT 1) THEN
      'Corriger l''erreur dans l''edge function'
    WHEN NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'GOOGLE_CSE_API_KEY') THEN
      'Configurer Google Custom Search Engine API'
    ELSE 'Système OK - Attendre prochain scan automatique'
  END as action_recommandee;

-- 🔟 PROCHAINES ÉTAPES
SELECT '═══════════════════════════════════════════════════' as separateur;

SELECT 
  '🎯 PROCHAINES ÉTAPES' as titre,
  '1. Lire le diagnostic ci-dessus' as etape_1,
  '2. Vérifier si edge function scan-backlinks est déployée' as etape_2,
  '3. Si pas de cron: exécuter ACTIVER-SCRAPING-BACKLINKS-AUTO-V2.sql' as etape_3,
  '4. Si cron OK mais pas de scan: tester manuellement avec la commande ci-dessus' as etape_4,
  '5. Si API manquante: configurer Google CSE (optionnel)' as etape_5;
