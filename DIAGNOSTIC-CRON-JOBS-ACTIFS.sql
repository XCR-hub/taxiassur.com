/*
  DIAGNOSTIC COMPLET DES CRON JOBS ACTIFS

  Affiche tous les cron jobs configurés dans le système
*/

-- Liste complète des cron jobs avec leur configuration
SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
ORDER BY jobname;

-- Résumé des cron jobs par catégorie
SELECT
  CASE
    WHEN jobname LIKE 'generate-%' OR jobname LIKE '%content%' OR jobname LIKE '%blog%' OR jobname LIKE '%city%' OR jobname LIKE '%faq%' THEN 'GÉNÉRATION CONTENU'
    WHEN jobname LIKE '%pinterest%' OR jobname LIKE '%linkedin%' OR jobname LIKE '%youtube%' OR jobname LIKE '%viral%' OR jobname LIKE '%social%' THEN 'RÉSEAUX SOCIAUX'
    WHEN jobname LIKE '%seo%' OR jobname LIKE '%google%' OR jobname LIKE '%backlink%' OR jobname LIKE '%index%' THEN 'SEO & INDEXATION'
    WHEN jobname LIKE '%taxi%' OR jobname LIKE '%scrape%' OR jobname LIKE '%prospect%' OR jobname LIKE '%followup%' THEN 'PROSPECTION'
    WHEN jobname LIKE '%ai%' OR jobname LIKE '%humanizer%' OR jobname LIKE '%trend%' THEN 'IA AUTO-APPRENANTE'
    WHEN jobname LIKE '%email%' OR jobname LIKE '%sms%' OR jobname LIKE '%outreach%' THEN 'COMMUNICATION'
    ELSE 'AUTRE'
  END as categorie,
  COUNT(*) as nombre_jobs,
  COUNT(*) FILTER (WHERE active = true) as actifs,
  COUNT(*) FILTER (WHERE active = false) as inactifs
FROM cron.job
GROUP BY categorie
ORDER BY actifs DESC;

-- Statistiques globales
SELECT
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE active = true) as jobs_actifs,
  COUNT(*) FILTER (WHERE active = false) as jobs_inactifs,
  ROUND(100.0 * COUNT(*) FILTER (WHERE active = true) / NULLIF(COUNT(*), 0), 1) as pourcentage_actif
FROM cron.job;

-- Vérifier l'extension pg_cron
SELECT
  extname as extension,
  extversion as version,
  CASE
    WHEN extname = 'pg_cron' THEN '✅ ACTIVÉE'
    ELSE '⚠️ NON TROUVÉE'
  END as statut
FROM pg_extension
WHERE extname = 'pg_cron';
