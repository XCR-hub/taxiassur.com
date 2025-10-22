/*
  VERIFICATION COMPLETE DE TOUS LES CRON JOBS

  Exécute ce script dans Supabase SQL Editor pour vérifier
  l'état de tous les cron jobs (>40 automatisations)
*/

-- ============================================
-- 1. LISTE COMPLETE DE TOUS LES CRON JOBS
-- ============================================

SELECT
  jobid,
  jobname,
  schedule,
  command,
  active,
  CASE
    WHEN active THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as status
FROM cron.job
ORDER BY active DESC, jobname;


-- ============================================
-- 2. RESUME PAR STATUT
-- ============================================

SELECT
  CASE
    WHEN active THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as status,
  COUNT(*) as total
FROM cron.job
GROUP BY active
ORDER BY active DESC;


-- ============================================
-- 3. CRON JOBS PAR CATEGORIE
-- ============================================

SELECT
  CASE
    WHEN jobname ILIKE '%blog%' OR command ILIKE '%blog%' THEN '📝 Blog'
    WHEN jobname ILIKE '%faq%' THEN '❓ FAQ'
    WHEN jobname ILIKE '%news%' OR jobname ILIKE '%actualit%' THEN '📰 News'
    WHEN jobname ILIKE '%social%' OR jobname ILIKE '%linkedin%' OR jobname ILIKE '%pinterest%' OR jobname ILIKE '%youtube%' THEN '📱 Réseaux Sociaux'
    WHEN jobname ILIKE '%seo%' OR jobname ILIKE '%search%' OR jobname ILIKE '%google%' THEN '🔍 SEO'
    WHEN jobname ILIKE '%email%' OR jobname ILIKE '%lead%' THEN '📧 Email/Leads'
    WHEN jobname ILIKE '%city%' OR jobname ILIKE '%ville%' THEN '🏙️ Villes'
    WHEN jobname ILIKE '%backlink%' THEN '🔗 Backlinks'
    WHEN jobname ILIKE '%taxi%' OR jobname ILIKE '%prospect%' THEN '🚕 Taxis'
    WHEN jobname ILIKE '%ai%' OR jobname ILIKE '%viral%' THEN '🤖 IA'
    ELSE '⚙️ Autre'
  END as categorie,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE active = true) as actifs,
  COUNT(*) FILTER (WHERE active = false) as inactifs
FROM cron.job
GROUP BY
  CASE
    WHEN jobname ILIKE '%blog%' OR command ILIKE '%blog%' THEN '📝 Blog'
    WHEN jobname ILIKE '%faq%' THEN '❓ FAQ'
    WHEN jobname ILIKE '%news%' OR jobname ILIKE '%actualit%' THEN '📰 News'
    WHEN jobname ILIKE '%social%' OR jobname ILIKE '%linkedin%' OR jobname ILIKE '%pinterest%' OR jobname ILIKE '%youtube%' THEN '📱 Réseaux Sociaux'
    WHEN jobname ILIKE '%seo%' OR jobname ILIKE '%search%' OR jobname ILIKE '%google%' THEN '🔍 SEO'
    WHEN jobname ILIKE '%email%' OR jobname ILIKE '%lead%' THEN '📧 Email/Leads'
    WHEN jobname ILIKE '%city%' OR jobname ILIKE '%ville%' THEN '🏙️ Villes'
    WHEN jobname ILIKE '%backlink%' THEN '🔗 Backlinks'
    WHEN jobname ILIKE '%taxi%' OR jobname ILIKE '%prospect%' THEN '🚕 Taxis'
    WHEN jobname ILIKE '%ai%' OR jobname ILIKE '%viral%' THEN '🤖 IA'
    ELSE '⚙️ Autre'
  END
ORDER BY total DESC;


-- ============================================
-- 4. DETAIL PAR CATEGORIE AVEC NOM DES JOBS
-- ============================================

SELECT
  CASE
    WHEN jobname ILIKE '%blog%' OR command ILIKE '%blog%' THEN '📝 Blog'
    WHEN jobname ILIKE '%faq%' THEN '❓ FAQ'
    WHEN jobname ILIKE '%news%' OR jobname ILIKE '%actualit%' THEN '📰 News'
    WHEN jobname ILIKE '%social%' OR jobname ILIKE '%linkedin%' OR jobname ILIKE '%pinterest%' OR jobname ILIKE '%youtube%' THEN '📱 Réseaux Sociaux'
    WHEN jobname ILIKE '%seo%' OR jobname ILIKE '%search%' OR jobname ILIKE '%google%' THEN '🔍 SEO'
    WHEN jobname ILIKE '%email%' OR jobname ILIKE '%lead%' THEN '📧 Email/Leads'
    WHEN jobname ILIKE '%city%' OR jobname ILIKE '%ville%' THEN '🏙️ Villes'
    WHEN jobname ILIKE '%backlink%' THEN '🔗 Backlinks'
    WHEN jobname ILIKE '%taxi%' OR jobname ILIKE '%prospect%' THEN '🚕 Taxis'
    WHEN jobname ILIKE '%ai%' OR jobname ILIKE '%viral%' THEN '🤖 IA'
    ELSE '⚙️ Autre'
  END as categorie,
  jobname,
  schedule,
  active
FROM cron.job
ORDER BY
  CASE
    WHEN jobname ILIKE '%blog%' OR command ILIKE '%blog%' THEN 1
    WHEN jobname ILIKE '%faq%' THEN 2
    WHEN jobname ILIKE '%news%' OR jobname ILIKE '%actualit%' THEN 3
    WHEN jobname ILIKE '%social%' OR jobname ILIKE '%linkedin%' OR jobname ILIKE '%pinterest%' OR jobname ILIKE '%youtube%' THEN 4
    WHEN jobname ILIKE '%seo%' OR jobname ILIKE '%search%' OR jobname ILIKE '%google%' THEN 5
    WHEN jobname ILIKE '%email%' OR jobname ILIKE '%lead%' THEN 6
    WHEN jobname ILIKE '%city%' OR jobname ILIKE '%ville%' THEN 7
    WHEN jobname ILIKE '%backlink%' THEN 8
    WHEN jobname ILIKE '%taxi%' OR jobname ILIKE '%prospect%' THEN 9
    WHEN jobname ILIKE '%ai%' OR jobname ILIKE '%viral%' THEN 10
    ELSE 11
  END,
  active DESC,
  jobname;


-- ============================================
-- 5. ANALYSE COMPLETE
-- ============================================

DO $$
DECLARE
  total_jobs INTEGER;
  active_jobs INTEGER;
  inactive_jobs INTEGER;
BEGIN
  -- Compter total
  SELECT COUNT(*) INTO total_jobs FROM cron.job;
  SELECT COUNT(*) INTO active_jobs FROM cron.job WHERE active = true;
  SELECT COUNT(*) INTO inactive_jobs FROM cron.job WHERE active = false;

  RAISE NOTICE '============================================';
  RAISE NOTICE '📊 ANALYSE COMPLETE DES CRON JOBS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total cron jobs: %', total_jobs;
  RAISE NOTICE '✅ Actifs: %', active_jobs;
  RAISE NOTICE '❌ Inactifs: %', inactive_jobs;
  RAISE NOTICE '';

  -- Recommandations
  IF total_jobs >= 40 THEN
    RAISE NOTICE '✅ Plus de 40 cron jobs configurés!';
  ELSIF total_jobs >= 20 THEN
    RAISE NOTICE '⚠️ % cron jobs configurés (objectif: 40+)', total_jobs;
  ELSE
    RAISE NOTICE '❌ Seulement % cron jobs configurés (objectif: 40+)', total_jobs;
  END IF;

  IF active_jobs >= 40 THEN
    RAISE NOTICE '✅ Plus de 40 automatisations actives! PARFAIT!';
  ELSIF active_jobs >= 20 THEN
    RAISE NOTICE '⚠️ % automatisations actives (objectif: 40+)', active_jobs;
  ELSIF active_jobs >= 10 THEN
    RAISE NOTICE '⚠️ Seulement % automatisations actives', active_jobs;
  ELSE
    RAISE NOTICE '❌ TRES PEU d''automatisations actives: %', active_jobs;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;


-- ============================================
-- 6. CRON JOBS INACTIFS (à activer)
-- ============================================

SELECT
  jobid,
  jobname,
  schedule,
  CASE
    WHEN jobname ILIKE '%blog%' OR command ILIKE '%blog%' THEN '📝 Blog'
    WHEN jobname ILIKE '%faq%' THEN '❓ FAQ'
    WHEN jobname ILIKE '%news%' OR jobname ILIKE '%actualit%' THEN '📰 News'
    WHEN jobname ILIKE '%social%' OR jobname ILIKE '%linkedin%' OR jobname ILIKE '%pinterest%' OR jobname ILIKE '%youtube%' THEN '📱 Réseaux Sociaux'
    WHEN jobname ILIKE '%seo%' OR jobname ILIKE '%search%' OR jobname ILIKE '%google%' THEN '🔍 SEO'
    WHEN jobname ILIKE '%email%' OR jobname ILIKE '%lead%' THEN '📧 Email/Leads'
    WHEN jobname ILIKE '%city%' OR jobname ILIKE '%ville%' THEN '🏙️ Villes'
    WHEN jobname ILIKE '%backlink%' THEN '🔗 Backlinks'
    WHEN jobname ILIKE '%taxi%' OR jobname ILIKE '%prospect%' THEN '🚕 Taxis'
    WHEN jobname ILIKE '%ai%' OR jobname ILIKE '%viral%' THEN '🤖 IA'
    ELSE '⚙️ Autre'
  END as categorie
FROM cron.job
WHERE active = false
ORDER BY jobname;


-- ============================================
-- RESULTATS ATTENDUS:
-- ============================================
-- ✅ Plus de 40 cron jobs configurés
-- ✅ Plus de 40 cron jobs actifs
--
-- Catégories principales:
-- - 📝 Blog (génération articles)
-- - ❓ FAQ (génération FAQ)
-- - 📰 News (actualités)
-- - 📱 Réseaux Sociaux (LinkedIn, Pinterest, YouTube)
-- - 🔍 SEO (Google Search Console, indexation)
-- - 📧 Email/Leads (suivi prospects)
-- - 🏙️ Villes (pages locales)
-- - 🔗 Backlinks (partenariats)
-- - 🚕 Taxis (scraping, prospection)
-- - 🤖 IA (auto-amélioration, viral content)
-- ============================================
