-- ══════════════════════════════════════════════════════════════════
--  DIAGNOSTIC: POURQUOI LE SCAN NE TROUVE PAS DE NOUVEAUX SITES?
-- ══════════════════════════════════════════════════════════════════

-- 1) Vérifier si le scan a bien été exécuté
SELECT 
  '🔍 HISTORIQUE SCANS' as section,
  COUNT(*) as nb_scans,
  MAX(created_at) as dernier_scan,
  MAX(opportunities_found) as max_opportunites_trouvees
FROM backlink_scan_history;

-- 2) Voir les derniers scans en détail
SELECT 
  '📊 DÉTAILS DERNIERS SCANS' as section,
  id,
  status,
  opportunities_found,
  scan_duration_ms,
  competitors_scanned,
  error_message,
  created_at
FROM backlink_scan_history
ORDER BY created_at DESC
LIMIT 5;

-- 3) Vérifier si Google CSE API est configurée
SELECT 
  '🔑 CONFIGURATION API' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'GOOGLE_CSE_API_KEY') 
    THEN '✅ GOOGLE_CSE_API_KEY configurée'
    ELSE '❌ GOOGLE_CSE_API_KEY manquante → utilise données démo'
  END as google_cse_key,
  CASE 
    WHEN EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'GOOGLE_CSE_CX_ID') 
    THEN '✅ GOOGLE_CSE_CX_ID configurée'
    ELSE '❌ GOOGLE_CSE_CX_ID manquante'
  END as google_cse_cx,
  CASE 
    WHEN EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'HUNTER_IO_API_KEY') 
    THEN '✅ HUNTER_IO_API_KEY configurée'
    ELSE '⚠️ HUNTER_IO_API_KEY manquante (optionnel)'
  END as hunter_io_key;

-- 4) Vérifier les opportunités existantes
SELECT 
  '📋 OPPORTUNITÉS ACTUELLES' as section,
  COUNT(*) as total,
  COUNT(DISTINCT domain) as domaines_uniques,
  MIN(created_at) as premiere,
  MAX(created_at) as derniere,
  MAX(created_at) - MIN(created_at) as ecart
FROM backlink_opportunities;

-- 5) Vérifier si edge function est accessible
SELECT 
  '🚀 EDGE FUNCTION STATUS' as section,
  'scan-backlinks' as fonction,
  'Vérifier manuellement dans Supabase → Edge Functions' as action;

-- RÉSUMÉ
SELECT '═══════════════════════════════════════════════════' as separateur;

SELECT 
  '📋 DIAGNOSTIC' as titre,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM backlink_scan_history) THEN
      '❌ Aucun scan exécuté → Le SELECT net.http_post() n''a pas fonctionné'
    WHEN EXISTS (
      SELECT 1 FROM backlink_scan_history 
      WHERE status = 'failed' 
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN
      '❌ Dernier scan en erreur → Voir error_message'
    WHEN EXISTS (
      SELECT 1 FROM backlink_scan_history 
      WHERE status = 'success' AND opportunities_found = 0
    ) THEN
      '⚠️ Scan OK mais 0 opportunités trouvées → API Google CSE manquante ou limit atteinte'
    WHEN EXISTS (
      SELECT 1 FROM backlink_scan_history 
      WHERE status = 'success' AND opportunities_found > 0
    ) THEN
      '✅ Scan OK avec opportunités trouvées'
    ELSE
      '❓ Statut inconnu'
  END as diagnostic;
