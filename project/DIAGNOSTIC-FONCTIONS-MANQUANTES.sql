/*
  🔍 DIAGNOSTIC - Vérifier si les fonctions existent

  COPIER/COLLER dans Supabase SQL Editor
  https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql
*/

-- ============================================
-- 1. VÉRIFIER SI LES FONCTIONS EXISTENT
-- ============================================

SELECT
  routine_name as "Fonction",
  routine_type as "Type",
  security_type as "Sécurité",
  CASE
    WHEN security_type = 'DEFINER' THEN '✅ OK (a les permissions)'
    ELSE '❌ PROBLÈME (pas de permissions)'
  END as "Statut"
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('toggle_automation', 'execute_sql', 'get_automations')
ORDER BY routine_name;

-- ============================================
-- 2. VÉRIFIER LES CRON JOBS
-- ============================================

SELECT
  jobid,
  jobname,
  active,
  schedule
FROM cron.job
LIMIT 5;

-- ============================================
-- RÉSULTATS ATTENDUS
-- ============================================

/*
SI LES FONCTIONS EXISTENT:
┌────────────────────┬──────────┬──────────┬─────────────────────────────┐
│ Fonction           │ Type     │ Sécurité │ Statut                      │
├────────────────────┼──────────┼──────────┼─────────────────────────────┤
│ execute_sql        │ FUNCTION │ DEFINER  │ ✅ OK (a les permissions)   │
│ get_automations    │ FUNCTION │ DEFINER  │ ✅ OK (a les permissions)   │
│ toggle_automation  │ FUNCTION │ DEFINER  │ ✅ OK (a les permissions)   │
└────────────────────┴──────────┴──────────┴─────────────────────────────┘

SI LES FONCTIONS N'EXISTENT PAS:
(Aucun résultat) ← ❌ PROBLÈME: Vous devez exécuter FIX-PERMISSION-CRON-401.sql

SI SÉCURITÉ = INVOKER:
❌ PROBLÈME: Les fonctions existent mais sans SECURITY DEFINER
→ Vous devez recréer les fonctions avec FIX-PERMISSION-CRON-401.sql
*/
