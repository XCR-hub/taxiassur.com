/*
  ⚡ ACTIVER TOUS LES CRON JOBS VIA LA FONCTION RPC

  IMPORTANT: Ne PAS utiliser UPDATE directement
  → Utiliser la fonction execute_sql() qui a SECURITY DEFINER

  COPIER/COLLER dans Supabase SQL Editor
  https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql
*/

-- ============================================
-- 1. VÉRIFIER QUE LA FONCTION EXISTE
-- ============================================
SELECT 'Fonction execute_sql existe: ' || 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'execute_sql'
    ) THEN '✅ OUI'
    ELSE '❌ NON - Exécuter FIX-PERMISSION-CRON-401.sql d''abord'
  END as status;

-- ============================================
-- 2. ÉTAT AVANT ACTIVATION
-- ============================================
SELECT
  'AVANT' as etape,
  COUNT(*) as total_crons,
  COUNT(*) FILTER (WHERE active = true) as actifs,
  COUNT(*) FILTER (WHERE active = false) as inactifs
FROM cron.job;

-- ============================================
-- 3. ACTIVER TOUS LES CRONS VIA FONCTION RPC
-- ============================================
SELECT execute_sql('UPDATE cron.job SET active = true');

-- ============================================
-- 4. ÉTAT APRÈS ACTIVATION
-- ============================================
SELECT
  'APRÈS' as etape,
  COUNT(*) as total_crons,
  COUNT(*) FILTER (WHERE active = true) as actifs,
  COUNT(*) FILTER (WHERE active = false) as inactifs
FROM cron.job;

-- ============================================
-- 5. LISTE COMPLÈTE DES CRONS ACTIFS
-- ============================================
SELECT
  jobid,
  jobname,
  schedule,
  CASE WHEN active THEN '✅' ELSE '❌' END as actif
FROM cron.job
ORDER BY jobname;

-- ============================================
-- 6. RÉSUMÉ FINAL
-- ============================================
SELECT
  '🎉 ACTIVATION TERMINÉE' as message,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE active = true) as actifs,
  ROUND((COUNT(*) FILTER (WHERE active = true)::numeric / COUNT(*)::numeric) * 100, 0) || '%' as pourcentage
FROM cron.job;

-- ============================================
-- RÉSULTATS ATTENDUS
-- ============================================
/*
Résultat 1 - Vérification fonction:
┌────────────────────────────────────────┐
│ status                                 │
├────────────────────────────────────────┤
│ Fonction execute_sql existe: ✅ OUI    │
└────────────────────────────────────────┘

Résultat 2 - État avant:
┌────────┬──────────────┬─────────┬───────────┐
│ etape  │ total_crons  │ actifs  │ inactifs  │
├────────┼──────────────┼─────────┼───────────┤
│ AVANT  │ 53           │ 5       │ 48        │
└────────┴──────────────┴─────────┴───────────┘

Résultat 3 - Exécution:
┌─────────┬────────────────┬──────────────────────────────────────┐
│ success │ affected_rows  │ message                              │
├─────────┼────────────────┼──────────────────────────────────────┤
│ true    │ 48             │ Requête exécutée avec succès         │
└─────────┴────────────────┴──────────────────────────────────────┘

Résultat 4 - État après:
┌────────┬──────────────┬─────────┬───────────┐
│ etape  │ total_crons  │ actifs  │ inactifs  │
├────────┼──────────────┼─────────┼───────────┤
│ APRÈS  │ 53           │ 53      │ 0         │
└────────┴──────────────┴─────────┴───────────┘

Résultat 5 - Liste (53 lignes):
┌────────┬──────────────────────────────────┬──────────────┬────────┐
│ jobid  │ jobname                          │ schedule     │ actif  │
├────────┼──────────────────────────────────┼──────────────┼────────┤
│ 321    │ daily-unified-content-generation │ 0 4 * * *    │ ✅     │
│ 277    │ linkedin_afternoon               │ 0 14 * * *   │ ✅     │
│ 284    │ youtube_daily                    │ 0 20 * * *   │ ✅     │
│ ...    │ ...                              │ ...          │ ✅     │
└────────┴──────────────────────────────────┴──────────────┴────────┘

Résultat 6 - Résumé:
┌───────────────────────────┬────────┬─────────┬──────────────┐
│ message                   │ total  │ actifs  │ pourcentage  │
├───────────────────────────┼────────┼─────────┼──────────────┤
│ 🎉 ACTIVATION TERMINÉE    │ 53     │ 53      │ 100%         │
└───────────────────────────┴────────┴─────────┴──────────────┘

APRÈS EXÉCUTION:
1. Tous les 53 crons sont activés ✅
2. Aller sur: https://taxiassur.com/backoffice/auto-optimizer
3. Vider cache: Ctrl+Shift+R
4. Compteur doit afficher: 53/53 🎉
5. Tous les switches doivent être ON ✅
*/
