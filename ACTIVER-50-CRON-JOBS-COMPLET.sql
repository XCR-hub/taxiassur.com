/*
  ⚡ ACTIVATION COMPLÈTE DE TOUS LES CRON JOBS (50+)

  COPIER/COLLER dans Supabase SQL Editor
  https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql
*/

-- 1. ÉTAT AVANT
SELECT
  'AVANT' as etape,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE active = true) as actifs,
  COUNT(*) FILTER (WHERE active = false) as inactifs
FROM cron.job;

-- 2. ACTIVER TOUS
UPDATE cron.job SET active = true;

-- 3. ÉTAT APRÈS
SELECT
  'APRÈS' as etape,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE active = true) as actifs,
  COUNT(*) FILTER (WHERE active = false) as inactifs
FROM cron.job;

-- 4. LISTE COMPLÈTE
SELECT
  jobid,
  jobname,
  schedule,
  CASE WHEN active THEN 'OUI' ELSE 'NON' END as actif
FROM cron.job
ORDER BY jobname;
