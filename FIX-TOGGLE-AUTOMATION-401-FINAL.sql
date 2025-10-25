/*
  🔧 FIX: Permission denied pour toggle_automation

  Erreur console:
  POST .../rpc/toggle_automation 401 (Unauthorized)
  Error: permission denied for table job

  Cause: La fonction toggle_automation n'a pas SECURITY DEFINER
  
  Solution: Drop + Recréer avec SECURITY DEFINER
*/

-- ============================================
-- 1. VÉRIFIER L'ÉTAT ACTUEL
-- ============================================
SELECT
  proname as "Fonction",
  prosecdef as "Security Definer",
  CASE WHEN prosecdef THEN '✅ OUI' ELSE '❌ NON' END as "Status"
FROM pg_proc
WHERE proname IN ('toggle_automation', 'execute_sql', 'get_automations')
ORDER BY proname;

-- ============================================
-- 2. DROP ET RECRÉER toggle_automation
-- ============================================
DROP FUNCTION IF EXISTS toggle_automation(TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION toggle_automation(
  automation_name TEXT,
  enabled BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- ← IMPORTANT: Permet d'accéder à cron.job
SET search_path = public, cron
AS $$
DECLARE
  affected_count INT;
  job_exists BOOLEAN;
BEGIN
  -- Vérifier si le job existe
  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = automation_name
  ) INTO job_exists;

  IF NOT job_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cron job "' || automation_name || '" not found',
      'affected_rows', 0
    );
  END IF;

  -- Mettre à jour le statut
  UPDATE cron.job
  SET active = enabled
  WHERE jobname = automation_name;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

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
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Erreur: ' || SQLERRM,
      'affected_rows', 0
    );
END;
$$;

-- ============================================
-- 3. ACCORDER LES PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO service_role;

-- ============================================
-- 4. VÉRIFIER LA NOUVELLE FONCTION
-- ============================================
SELECT
  proname as "Fonction",
  prosecdef as "Security Definer",
  CASE WHEN prosecdef THEN '✅ OUI' ELSE '❌ NON' END as "Status"
FROM pg_proc
WHERE proname = 'toggle_automation';

-- ============================================
-- 5. TESTER LA FONCTION
-- ============================================
-- Test 1: Activer un cron
SELECT toggle_automation('daily-unified-content-generation', true);

-- Test 2: Désactiver un cron
SELECT toggle_automation('daily-unified-content-generation', false);

-- Test 3: Réactiver
SELECT toggle_automation('daily-unified-content-generation', true);

-- ============================================
-- 6. VÉRIFIER L'ÉTAT DES CRONS
-- ============================================
SELECT
  COUNT(*) as total_crons,
  COUNT(*) FILTER (WHERE active = true) as actifs,
  COUNT(*) FILTER (WHERE active = false) as inactifs
FROM cron.job;

-- ============================================
-- RÉSULTATS ATTENDUS
-- ============================================
/*
Résultat 1 - État actuel:
┌────────────────────┬──────────────────┬──────────┐
│ Fonction           │ Security Definer │ Status   │
├────────────────────┼──────────────────┼──────────┤
│ execute_sql        │ true             │ ✅ OUI   │
│ get_automations    │ true             │ ✅ OUI   │
│ toggle_automation  │ false            │ ❌ NON   │ ← PROBLÈME
└────────────────────┴──────────────────┴──────────┘

Résultat 2-3: (Drop + Create, pas de résultat affiché)

Résultat 4 - Nouvelle fonction:
┌───────────────────┬──────────────────┬──────────┐
│ Fonction          │ Security Definer │ Status   │
├───────────────────┼──────────────────┼──────────┤
│ toggle_automation │ true             │ ✅ OUI   │ ← CORRIGÉ
└───────────────────┴──────────────────┴──────────┘

Résultat 5 - Test activation:
{
  "success": true,
  "message": "Automation \"daily-unified-content-generation\" activée",
  "enabled": true,
  "affected_rows": 1,
  "automation_name": "daily-unified-content-generation"
}

Résultat 6 - Test désactivation:
{
  "success": true,
  "message": "Automation \"daily-unified-content-generation\" désactivée",
  "enabled": false,
  "affected_rows": 1,
  "automation_name": "daily-unified-content-generation"
}

Résultat 7 - Test réactivation:
{
  "success": true,
  "message": "Automation \"daily-unified-content-generation\" activée",
  "enabled": true,
  "affected_rows": 1,
  "automation_name": "daily-unified-content-generation"
}

Résultat 8 - État final:
┌──────────────┬─────────┬───────────┐
│ total_crons  │ actifs  │ inactifs  │
├──────────────┼─────────┼───────────┤
│ 53           │ 53      │ 0         │
└──────────────┴─────────┴───────────┘

APRÈS EXÉCUTION:

1. ✅ Fonction toggle_automation a SECURITY DEFINER
2. ✅ Tests réussis (activation/désactivation)
3. ✅ Tous les crons sont actifs

4. Tester sur: https://taxiassur.com/backoffice/auto-optimizer
   - Vider cache: Ctrl+Shift+R
   - Cliquer sur un switch → ✅ Doit fonctionner
   - Plus d'erreur 401 dans la console ✅

DURÉE: 30 secondes
*/
