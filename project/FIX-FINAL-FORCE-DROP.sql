/*
  🔧 FIX DÉFINITIF: FORCER LA SUPPRESSION ET RECRÉATION

  PROBLÈME: CREATE OR REPLACE ne met PAS à jour SECURITY DEFINER
  SOLUTION: DROP CASCADE + CREATE avec vérification
*/

-- ============================================
-- 1. VÉRIFIER L'ÉTAT AVANT
-- ============================================
SELECT 
  p.proname as "Fonction",
  p.prosecdef as "Has SECURITY DEFINER",
  CASE WHEN p.prosecdef THEN '✅ OUI' ELSE '❌ NON (problème)' END as "Status"
FROM pg_proc p
WHERE p.proname = 'toggle_automation';

-- ============================================
-- 2. FORCER LA SUPPRESSION COMPLÈTE
-- ============================================
-- Supprimer TOUTES les versions de la fonction
DROP FUNCTION IF EXISTS toggle_automation(TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS toggle_automation(text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.toggle_automation(TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.toggle_automation(text, boolean) CASCADE;

-- Vérifier qu'elle a bien été supprimée
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'toggle_automation')
    THEN '✅ Fonction supprimée avec succès'
    ELSE '❌ Fonction existe encore (problème)'
  END as "Statut suppression";

-- ============================================
-- 3. RECRÉER AVEC SECURITY DEFINER
-- ============================================
CREATE FUNCTION toggle_automation(
  automation_name TEXT,
  enabled BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- ← CRITIQUE: Permet accès à cron.job
SET search_path = public, cron
AS $$
DECLARE
  affected_count INT;
  job_exists BOOLEAN;
BEGIN
  -- Log pour debugging
  RAISE NOTICE 'toggle_automation appelée: % -> %', automation_name, enabled;

  -- Vérifier si le job existe
  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = automation_name
  ) INTO job_exists;

  IF NOT job_exists THEN
    RAISE NOTICE 'Job non trouvé: %', automation_name;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cron job "' || automation_name || '" not found',
      'affected_rows', 0
    );
  END IF;

  -- Mettre à jour le statut (avec privilèges DEFINER)
  UPDATE cron.job
  SET active = enabled
  WHERE jobname = automation_name;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RAISE NOTICE 'Job mis à jour: % lignes affectées', affected_count;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Automation "' || automation_name || '" ' || 
               CASE WHEN enabled THEN 'activée' ELSE 'désactivée' END,
    'affected_rows', affected_count,
    'automation_name', automation_name,
    'enabled', enabled
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erreur: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Erreur: ' || SQLERRM,
      'affected_rows', 0
    );
END;
$$;

-- ============================================
-- 4. VÉRIFIER LA NOUVELLE FONCTION
-- ============================================
SELECT 
  p.proname as "Fonction",
  p.prosecdef as "Has SECURITY DEFINER",
  CASE WHEN p.prosecdef THEN '✅ OUI - Corrigé!' ELSE '❌ NON - Échec!' END as "Status",
  pg_get_functiondef(p.oid) LIKE '%SECURITY DEFINER%' as "Contient SECURITY DEFINER"
FROM pg_proc p
WHERE p.proname = 'toggle_automation';

-- ============================================
-- 5. ACCORDER LES PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO service_role;

-- ============================================
-- 6. TEST COMPLET
-- ============================================
-- Test 1: Activer
SELECT '=== TEST 1: Activer ===' as test;
SELECT toggle_automation('daily-unified-content-generation', true);

-- Vérifier l'état
SELECT 
  jobname,
  active,
  CASE WHEN active THEN '✅ ON' ELSE '❌ OFF' END as status
FROM cron.job
WHERE jobname = 'daily-unified-content-generation';

-- Test 2: Désactiver
SELECT '=== TEST 2: Désactiver ===' as test;
SELECT toggle_automation('daily-unified-content-generation', false);

-- Vérifier l'état
SELECT 
  jobname,
  active,
  CASE WHEN active THEN '✅ ON' ELSE '❌ OFF' END as status
FROM cron.job
WHERE jobname = 'daily-unified-content-generation';

-- Test 3: Réactiver
SELECT '=== TEST 3: Réactiver ===' as test;
SELECT toggle_automation('daily-unified-content-generation', true);

-- Vérifier l'état final
SELECT 
  jobname,
  active,
  CASE WHEN active THEN '✅ ON' ELSE '❌ OFF' END as status
FROM cron.job
WHERE jobname = 'daily-unified-content-generation';

-- ============================================
-- 7. RÉSUMÉ FINAL
-- ============================================
SELECT
  '🎉 FIX TERMINÉ' as message,
  COUNT(*) as total_crons,
  COUNT(*) FILTER (WHERE active = true) as actifs,
  COUNT(*) FILTER (WHERE active = false) as inactifs,
  ROUND((COUNT(*) FILTER (WHERE active = true)::numeric / COUNT(*)::numeric) * 100, 0) || '%' as pourcentage_actif
FROM cron.job;

/*
RÉSULTATS ATTENDUS:

Résultat 1 - État avant:
┌─────────────────────┬───────────────────────┬──────────────────┐
│ Fonction            │ Has SECURITY DEFINER  │ Status           │
├─────────────────────┼───────────────────────┼──────────────────┤
│ toggle_automation   │ false                 │ ❌ NON (problème)│
└─────────────────────┴───────────────────────┴──────────────────┘

Résultat 2-3: Suppression + Vérification
✅ Fonction supprimée avec succès

Résultat 4 - Nouvelle fonction:
┌───────────────────┬──────────────────────┬────────────────┬─────────────────────────────┐
│ Fonction          │ Has SECURITY DEFINER │ Status         │ Contient SECURITY DEFINER   │
├───────────────────┼──────────────────────┼────────────────┼─────────────────────────────┤
│ toggle_automation │ true                 │ ✅ OUI - Corrigé! │ true                     │
└───────────────────┴──────────────────────┴────────────────┴─────────────────────────────┘

Résultat 5: (Permissions, pas d'affichage)

Résultats 6-14: Tests
{
  "success": true,
  "message": "Automation \"daily-unified-content-generation\" activée",
  ...
}

Résultat 15 - Résumé:
┌──────────────────┬──────────────┬─────────┬───────────┬───────────────────┐
│ message          │ total_crons  │ actifs  │ inactifs  │ pourcentage_actif │
├──────────────────┼──────────────┼─────────┼───────────┼───────────────────┤
│ 🎉 FIX TERMINÉ   │ 53           │ 53      │ 0         │ 100%              │
└──────────────────┴──────────────┴─────────┴───────────┴───────────────────┘

SI LE RÉSULTAT 4 MONTRE "Has SECURITY DEFINER = true" → ✅ C'EST BON!

APRÈS EXÉCUTION:
1. https://taxiassur.com/backoffice/auto-optimizer
2. Ctrl+Shift+R (vider cache)
3. Cliquer switch → ✅ Doit marcher
4. Console → Plus d'erreur 401 ✅
*/
