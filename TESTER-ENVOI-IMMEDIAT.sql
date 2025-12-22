-- ============================================
-- FICHIER 2 : TEST IMMÉDIAT
-- À EXÉCUTER APRÈS LE FICHIER 1
-- ENVOIE 5 EMAILS MAINTENANT (sans attendre 3h)
-- ============================================

-- Récupérer l'ID de la campagne et déclencher l'envoi
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
    'maxEmailsPerRun', 5,
    'testMode', false
  )
) as reponse;

-- Attendre 10 secondes
SELECT pg_sleep(10);

-- Vérifier les emails envoyés
SELECT
  domain,
  contact_email,
  outreach_sent,
  outreach_date,
  status
FROM backlink_opportunities
WHERE outreach_sent = true
ORDER BY outreach_date DESC
LIMIT 10;
