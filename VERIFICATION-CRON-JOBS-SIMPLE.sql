-- ============================================
-- VERIFICATION CRON JOBS - Version Simple
-- ============================================

-- Liste tous les cron jobs
SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
ORDER BY active DESC, jobname;

-- Resume par statut
SELECT
  active,
  COUNT(*) as total
FROM cron.job
GROUP BY active
ORDER BY active DESC;
