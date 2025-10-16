-- ============================================================================
-- VÉRIFICATION COMPLÈTE ACTIVATION IA AUTONOME
-- À exécuter dans Supabase SQL Editor
-- ============================================================================

-- 1. VÉRIFIER LES CRONS ACTIFS
-- ============================================================================

SELECT
  '🤖 CRONS ACTIFS' as section,
  COUNT(*) as total_crons,
  COUNT(*) FILTER (WHERE active = true) as crons_actifs,
  COUNT(*) FILTER (WHERE active = false) as crons_inactifs
FROM cron.job;

-- Liste détaillée des crons
SELECT
  '📋 LISTE CRONS' as section,
  jobname as nom_cron,
  schedule as horaire,
  active as actif,
  CASE
    WHEN jobname LIKE '%daily%' THEN 'Quotidien'
    WHEN jobname LIKE '%weekly%' THEN 'Hebdomadaire'
    WHEN jobname LIKE '%master%' THEN 'Continu'
    ELSE 'Autre'
  END as frequence
FROM cron.job
ORDER BY active DESC, jobname;

-- ============================================================================
-- 2. VÉRIFIER LE CONTENU GÉNÉRÉ AUJOURD'HUI
-- ============================================================================

-- Articles blog
SELECT
  '📝 ARTICLES BLOG' as section,
  COUNT(*) as total_aujourdhui,
  COUNT(*) FILTER (WHERE featured_image IS NOT NULL) as avec_image,
  COUNT(*) FILTER (WHERE published = true) as publies
FROM blog_posts
WHERE created_at > CURRENT_DATE;

-- Pages ville
SELECT
  '🏙️ PAGES VILLE' as section,
  COUNT(*) as total_aujourdhui,
  COUNT(*) FILTER (WHERE published = true) as publiees
FROM city_pages
WHERE created_at > CURRENT_DATE;

-- Actualités
SELECT
  '📰 ACTUALITÉS' as section,
  COUNT(*) as total_aujourdhui,
  COUNT(*) FILTER (WHERE published = true) as publiees
FROM news_articles
WHERE created_at > CURRENT_DATE;

-- FAQ
SELECT
  '❓ FAQ' as section,
  COUNT(*) as total_aujourdhui
FROM faq_entries
WHERE created_at > CURRENT_DATE;

-- ============================================================================
-- 3. VÉRIFIER LES POSTS RÉSEAUX SOCIAUX
-- ============================================================================

SELECT
  '📱 POSTS RÉSEAUX SOCIAUX' as section,
  COUNT(*) as total_aujourdhui,
  COUNT(*) FILTER (WHERE platform = 'twitter') as twitter,
  COUNT(*) FILTER (WHERE platform = 'linkedin') as linkedin,
  COUNT(*) FILTER (WHERE platform = 'facebook') as facebook,
  COUNT(*) FILTER (WHERE published = true) as publies
FROM social_posts
WHERE created_at > CURRENT_DATE;

-- ============================================================================
-- 4. VÉRIFIER LES EMAILS ENVOYÉS
-- ============================================================================

-- Emails leads (follow-up)
SELECT
  '📧 EMAILS LEADS' as section,
  COUNT(*) as total_cette_semaine,
  COUNT(*) FILTER (WHERE status = 'sent') as envoyes,
  COUNT(*) FILTER (WHERE status = 'failed') as echecs
FROM email_logs
WHERE sent_at > CURRENT_DATE - INTERVAL '7 days'
  AND type = 'followup';

-- Emails backlinks
SELECT
  '🔗 EMAILS BACKLINKS' as section,
  COUNT(*) as total_cette_semaine,
  COUNT(*) FILTER (WHERE status = 'sent') as envoyes
FROM email_logs
WHERE sent_at > CURRENT_DATE - INTERVAL '7 days'
  AND type = 'backlink';

-- Emails partenariats
SELECT
  '🤝 EMAILS PARTENARIATS' as section,
  COUNT(*) as total_cette_semaine,
  COUNT(*) FILTER (WHERE status = 'sent') as envoyes
FROM email_logs
WHERE sent_at > CURRENT_DATE - INTERVAL '7 days'
  AND type = 'partnership';

-- ============================================================================
-- 5. VÉRIFIER LES LOGS D'AUTOMATISATION
-- ============================================================================

SELECT
  '📊 LOGS AUTOMATISATION' as section,
  automation_type as type,
  status,
  COUNT(*) as nombre,
  MAX(created_at) as derniere_execution
FROM automation_logs
WHERE created_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY automation_type, status
ORDER BY derniere_execution DESC;

-- ============================================================================
-- 6. VÉRIFIER LA SANTÉ DU SYSTÈME
-- ============================================================================

SELECT
  '💚 SANTÉ SYSTÈME' as section,
  *
FROM get_system_health();

-- ============================================================================
-- 7. VÉRIFIER STATUS COMPLET AUTOMATISATIONS
-- ============================================================================

SELECT
  '🎯 STATUS COMPLET' as section,
  *
FROM get_automation_status();

-- ============================================================================
-- 8. DERNIERS CONTENUS GÉNÉRÉS
-- ============================================================================

-- Derniers articles
SELECT
  '📝 DERNIERS ARTICLES' as section,
  title as titre,
  featured_image IS NOT NULL as a_image,
  published as publie,
  created_at as cree_le
FROM blog_posts
ORDER BY created_at DESC
LIMIT 5;

-- Dernières pages ville
SELECT
  '🏙️ DERNIÈRES PAGES VILLE' as section,
  city_name as ville,
  published as publiee,
  created_at as cree_le
FROM city_pages
ORDER BY created_at DESC
LIMIT 5;

-- Derniers posts sociaux
SELECT
  '📱 DERNIERS POSTS SOCIAUX' as section,
  platform as plateforme,
  LEFT(content, 100) || '...' as apercu,
  published as publie,
  created_at as cree_le
FROM social_posts
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 9. STATISTIQUES GLOBALES
-- ============================================================================

SELECT
  '📊 STATISTIQUES GLOBALES' as section,
  (SELECT COUNT(*) FROM blog_posts) as total_articles,
  (SELECT COUNT(*) FROM blog_posts WHERE published = true) as articles_publies,
  (SELECT COUNT(*) FROM city_pages) as total_pages_ville,
  (SELECT COUNT(*) FROM social_posts) as total_posts_sociaux,
  (SELECT COUNT(*) FROM leads) as total_leads,
  (SELECT COUNT(*) FROM backlink_opportunities) as opportunites_backlinks,
  (SELECT COUNT(*) FROM partner_prospects) as prospects_partenaires;

-- ============================================================================
-- 10. PROCHAINES EXÉCUTIONS CRON
-- ============================================================================

SELECT
  '⏰ PROCHAINES EXÉCUTIONS' as section,
  jobname as nom_cron,
  schedule as horaire,
  CASE
    WHEN schedule = '*/5 * * * *' THEN 'Dans 5 minutes'
    WHEN schedule = '0 4 * * *' THEN 'Demain 04h00'
    WHEN schedule = '0 9 * * *' THEN 'Aujourd''hui 09h00 (ou demain)'
    WHEN schedule = '0 15 * * *' THEN 'Aujourd''hui 15h00 (ou demain)'
    WHEN schedule = '0 19 * * *' THEN 'Aujourd''hui 19h00 (ou demain)'
    WHEN schedule = '0 8 * * 1' THEN 'Lundi prochain 08h00'
    WHEN schedule = '0 3 * * 3' THEN 'Mercredi prochain 03h00'
    ELSE 'Voir schedule'
  END as prochaine_execution
FROM cron.job
WHERE active = true
ORDER BY jobname;

-- ============================================================================
-- ✅ RÉSULTAT ATTENDU
-- ============================================================================

/*
SI TOUT FONCTIONNE, VOUS DEVRIEZ VOIR :

1. CRONS ACTIFS: 13+ crons actifs
2. ARTICLES BLOG: Au moins 1 article de test généré
3. PAGES VILLE: Au moins 1 page de test générée
4. LOGS AUTOMATISATION: Au moins 1 log 'success'
5. SANTÉ SYSTÈME: Database 100%, API 100%, Automation 100%

SI RIEN N'APPARAÎT :
- Les crons se déclencheront automatiquement aux heures prévues
- Premier article blog: Demain 04h00
- Premier post social: Aujourd'hui 09h00, 15h00 ou 19h00
- Premier email backlinks: Lundi prochain 08h00

PATIENCE : L'IA travaille automatiquement 24/7 !
*/
