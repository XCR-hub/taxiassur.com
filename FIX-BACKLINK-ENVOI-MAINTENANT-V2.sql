-- =====================================================
-- FIX BACKLINK : VERSION CORRIGÉE (sans colonnes manquantes)
-- =====================================================

-- ÉTAPE 1 : Changer "new" → "pending"
-- =====================================================
UPDATE backlink_opportunities
SET status = 'pending'
WHERE status = 'new' 
  AND contact_email IS NOT NULL 
  AND contact_email != '';

-- ÉTAPE 2 : Vérifier le résultat
-- =====================================================
SELECT 
  status,
  COUNT(*) as total,
  COUNT(CASE WHEN contact_email IS NOT NULL THEN 1 END) as avec_email
FROM backlink_opportunities
GROUP BY status
ORDER BY status;

-- ÉTAPE 3 : Créer une campagne (structure adaptée)
-- =====================================================
INSERT INTO backlink_campaigns (
  name, 
  status, 
  total_recipients,
  sent_count,
  reply_count
) VALUES (
  'Campagne Backlinks TaxiAssur',
  'active',
  100,
  0,
  0
)
ON CONFLICT DO NOTHING;

-- Vérifier la campagne
SELECT * FROM backlink_campaigns WHERE status = 'active';

-- ÉTAPE 4 : AUTO-UPDATE STATUS pour les futurs scans
-- =====================================================
CREATE OR REPLACE FUNCTION auto_update_backlink_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_email IS NOT NULL 
     AND NEW.contact_email != '' 
     AND NEW.status = 'new' THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_update_backlink_status ON backlink_opportunities;
CREATE TRIGGER trigger_auto_update_backlink_status
  BEFORE INSERT OR UPDATE ON backlink_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_backlink_status();

-- ÉTAPE 5 : TESTER L'ENVOI (3 emails)
-- =====================================================
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/backlink-auto-outreach',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5NzQ0NzUsImV4cCI6MjA0MzU1MDQ3NX0.t9TxdKBP__CU_lc6BVW5e1ELlT-_bEE7g0aHDYCRlCY',
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object(
    'maxEmailsPerRun', 3,
    'testMode', false
  )
);

-- ⏱️ ATTENDRE 30 SECONDES

-- ÉTAPE 6 : VÉRIFIER LES RÉSULTATS
-- =====================================================
SELECT 
  opportunity_id,
  email_sent,
  email_opened,
  created_at
FROM backlink_outreach_log
ORDER BY created_at DESC
LIMIT 10;

-- Statistiques
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
  COUNT(*) FILTER (WHERE outreach_sent = true) as emails_envoyes
FROM backlink_opportunities;
