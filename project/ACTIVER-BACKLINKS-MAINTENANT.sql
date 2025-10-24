-- ============================================
-- FICHIER 1 : CONFIGURATION COMPLÈTE BACKLINKS
-- À EXÉCUTER EN PREMIER SUR SUPABASE
-- ============================================

-- 1. Créer la table backlink_campaigns si elle n'existe pas
CREATE TABLE IF NOT EXISTS backlink_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text DEFAULT 'active',
  sent_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Créer une campagne par défaut
INSERT INTO backlink_campaigns (name, status)
VALUES ('Campagne Automatique 2025', 'active')
ON CONFLICT DO NOTHING
RETURNING id;

-- 3. Ajouter les colonnes manquantes
ALTER TABLE backlink_opportunities
ADD COLUMN IF NOT EXISTS outreach_sent boolean DEFAULT false;

ALTER TABLE backlink_opportunities
ADD COLUMN IF NOT EXISTS outreach_date timestamptz;

ALTER TABLE backlink_opportunities
ADD COLUMN IF NOT EXISTS last_contacted timestamptz;

-- 4. Marquer toutes les opportunités comme prêtes
UPDATE backlink_opportunities
SET outreach_sent = false
WHERE status = 'pending' AND contact_email IS NOT NULL;

-- 5. Compter combien d'emails sont prêts
SELECT
  COUNT(*) as emails_prets_a_envoyer,
  string_agg(DISTINCT domain, ', ') as exemples_domains
FROM (
  SELECT domain
  FROM backlink_opportunities
  WHERE status = 'pending'
    AND contact_email IS NOT NULL
    AND outreach_sent = false
  LIMIT 5
) sub;

-- 6. Créer le cron job d'envoi automatique (toutes les 3 heures)
SELECT cron.schedule(
  'backlink-auto-outreach-v2',
  '0 */3 * * *',
  $$
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
  );
  $$
);

-- 7. Vérifier que le cron est actif
SELECT
  jobname,
  schedule,
  active,
  CASE WHEN active THEN '✅ ACTIF' ELSE '❌ INACTIF' END as statut
FROM cron.job
WHERE jobname = 'backlink-auto-outreach-v2';
