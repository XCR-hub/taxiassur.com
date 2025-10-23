-- ============================================
-- FIX COMPLET BACKLINKS - DÉBLOCAGE IMMÉDIAT
-- ============================================

-- 1. DIAGNOSTIC : Voir ce qu'on a
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN contact_email IS NOT NULL THEN 1 END) as avec_email,
  COUNT(CASE WHEN contact_email IS NOT NULL AND outreach_sent = false THEN 1 END) as prets
FROM backlink_opportunities
WHERE status = 'pending';

-- 2. Voir les 5 premiers en détail
SELECT
  id,
  domain,
  contact_email,
  status,
  outreach_sent,
  domain_authority
FROM backlink_opportunities
WHERE status = 'pending'
  AND contact_email IS NOT NULL
ORDER BY domain_authority DESC NULLS LAST
LIMIT 5;

-- 3. FORCER outreach_sent à FALSE pour toutes les opportunités avec email
UPDATE backlink_opportunities
SET outreach_sent = false,
    outreach_date = NULL,
    last_contacted = NULL
WHERE contact_email IS NOT NULL
  AND status = 'pending';

-- 4. Vérifier combien sont maintenant prêts
SELECT
  COUNT(*) as opportunites_pretes_envoi,
  string_agg(domain, ', ') as exemples_5_premiers
FROM (
  SELECT domain
  FROM backlink_opportunities
  WHERE status = 'pending'
    AND contact_email IS NOT NULL
    AND outreach_sent = false
  ORDER BY domain_authority DESC NULLS LAST
  LIMIT 5
) sub;

-- 5. TEST : Envoyer 3 emails en mode test
WITH campaign AS (
  SELECT id FROM backlink_campaigns WHERE status = 'active' LIMIT 1
)
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/backlink-auto-outreach',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5NzQ0NzUsImV4cCI6MjA0MzU1MDQ3NX0.t9TxdKBP__CU_lc6BVW5e1ELlT-_bEE7g0aHDYCRlCY',
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object(
    'campaignId', (SELECT id FROM campaign),
    'maxEmailsPerRun', 3,
    'testMode', true
  )
) as response_test;

-- Attendre 5 secondes
SELECT pg_sleep(5);

-- 6. Voir le résultat du test
SELECT
  domain,
  contact_email,
  outreach_sent,
  status
FROM backlink_opportunities
WHERE status = 'pending'
  AND contact_email IS NOT NULL
ORDER BY domain_authority DESC NULLS LAST
LIMIT 10;
