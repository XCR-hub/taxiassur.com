-- ============================================
-- FICHIER 3 : VÉRIFICATION DES RÉSULTATS
-- À EXÉCUTER POUR VOIR LES EMAILS ENVOYÉS
-- ============================================

-- 1. Statistiques globales
SELECT
  COUNT(*) as total_opportunites,
  COUNT(CASE WHEN outreach_sent = true THEN 1 END) as emails_envoyes,
  COUNT(CASE WHEN outreach_sent = false AND contact_email IS NOT NULL THEN 1 END) as emails_en_attente,
  MAX(outreach_date) as dernier_envoi
FROM backlink_opportunities;

-- 2. Voir les 10 derniers emails envoyés
SELECT
  domain,
  contact_email,
  outreach_date,
  status,
  domain_authority
FROM backlink_opportunities
WHERE outreach_sent = true
ORDER BY outreach_date DESC
LIMIT 10;

-- 3. Voir les 5 prochains à envoyer
SELECT
  domain,
  contact_email,
  domain_authority,
  status
FROM backlink_opportunities
WHERE status = 'pending'
  AND contact_email IS NOT NULL
  AND outreach_sent = false
ORDER BY domain_authority DESC NULLS LAST
LIMIT 5;

-- 4. Vérifier le cron job
SELECT
  jobname,
  schedule,
  active,
  CASE WHEN active THEN '✅ ACTIF - Envoi toutes les 3h' ELSE '❌ INACTIF' END as statut
FROM cron.job
WHERE jobname = 'backlink-auto-outreach-v2';
