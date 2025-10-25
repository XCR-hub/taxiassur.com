-- ============================================
-- DIAGNOSTIC COMPLET SYSTÈME BACKLINKS
-- ============================================

-- 1. Vérifier qu'on a des opportunités avec emails
SELECT
  COUNT(*) as total_opportunites,
  COUNT(CASE WHEN contact_email IS NOT NULL THEN 1 END) as avec_email,
  COUNT(CASE WHEN contact_email IS NOT NULL AND status = 'pending' THEN 1 END) as prets_envoi,
  COUNT(CASE WHEN outreach_sent = true THEN 1 END) as deja_envoyes
FROM backlink_opportunities;

-- 2. Voir 5 exemples d'opportunités prêtes
SELECT
  domain,
  contact_email,
  status,
  outreach_sent,
  domain_authority
FROM backlink_opportunities
WHERE contact_email IS NOT NULL
  AND status = 'pending'
ORDER BY domain_authority DESC NULLS LAST
LIMIT 5;

-- 3. Vérifier la campagne
SELECT
  id,
  name,
  status,
  sent_count,
  created_at
FROM backlink_campaigns
ORDER BY created_at DESC
LIMIT 1;

-- 4. Vérifier si l'Edge Function existe
SELECT
  name,
  status,
  version
FROM supabase_functions.functions
WHERE name = 'backlink-auto-outreach'
LIMIT 1;

-- 5. Vérifier les logs d'erreurs récents
SELECT
  created_at,
  event_message,
  metadata
FROM supabase_functions.hooks
WHERE function_name = 'backlink-auto-outreach'
ORDER BY created_at DESC
LIMIT 5;
