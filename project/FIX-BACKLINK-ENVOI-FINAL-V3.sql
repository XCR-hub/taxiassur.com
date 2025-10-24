-- =====================================================
-- FIX BACKLINK : VERSION FINALE CORRECTE
-- =====================================================
-- Action : Passer 16 opportunités de "new" → "pending"
-- Tester l'envoi de 3 emails
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

-- Résultat attendu :
-- status   | total | avec_email
-- pending  |   17  |     17
-- new      |   10  |      0

-- ÉTAPE 3 : Créer une campagne (colonnes correctes)
-- =====================================================
INSERT INTO backlink_campaigns (
  name, 
  status, 
  target_count,
  sent_count,
  replied_count
) VALUES (
  'Campagne Backlinks TaxiAssur',
  'active',
  100,
  0,
  0
)
ON CONFLICT DO NOTHING;

-- Vérifier la campagne
SELECT id, name, status, sent_count, target_count
FROM backlink_campaigns 
WHERE status = 'active';

-- ÉTAPE 4 : AUTO-UPDATE STATUS pour les futurs scans
-- =====================================================
CREATE OR REPLACE FUNCTION auto_update_backlink_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si un email est ajouté et status = "new", passer à "pending"
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

-- ÉTAPE 5 : VÉRIFICATION FINALE
-- =====================================================
SELECT 
  'Opportunités' as table_name,
  COUNT(*) FILTER (WHERE status = 'pending' AND contact_email IS NOT NULL) as prets_envoi,
  COUNT(*) FILTER (WHERE status = 'contacted') as deja_contactes,
  COUNT(*) FILTER (WHERE outreach_sent = true) as emails_envoyes
FROM backlink_opportunities

UNION ALL

SELECT 
  'Campagnes' as table_name,
  COUNT(*) FILTER (WHERE status = 'active') as actives,
  SUM(sent_count) as emails_envoyes,
  SUM(target_count) as objectif_total
FROM backlink_campaigns;

-- =====================================================
-- RÉSULTAT ATTENDU :
-- =====================================================
-- Table          | Col1  | Col2 | Col3
-- Opportunités   |  16   |   0  |   0   (16 prêts, 0 contactés)
-- Campagnes      |   1   |   0  | 100   (1 active, 0 envoyés, objectif 100)
-- =====================================================

-- ÉTAPE 6 : TESTER L'ENVOI MAINTENANT
-- =====================================================
-- ⚠️ IMPORTANT : Vérifier que SENDGRID_API_KEY est configuré
-- Supabase → Project Settings → Edge Functions → Secrets
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

-- ÉTAPE 7 : VÉRIFIER LES LOGS D'ENVOI
-- =====================================================
SELECT 
  bl.id,
  bl.action_type,
  bl.recipient_email,
  bl.status,
  bl.created_at,
  bo.domain
FROM backlink_outreach_log bl
LEFT JOIN backlink_opportunities bo ON bl.opportunity_id = bo.id
ORDER BY bl.created_at DESC
LIMIT 10;

-- ÉTAPE 8 : VÉRIFIER LES OPPORTUNITÉS CONTACTÉES
-- =====================================================
SELECT 
  domain,
  contact_email,
  status,
  outreach_sent,
  contacted_at
FROM backlink_opportunities
WHERE outreach_sent = true
ORDER BY contacted_at DESC
LIMIT 10;

-- =====================================================
-- SI TOUT FONCTIONNE :
-- =====================================================
-- ✅ 3 lignes dans backlink_outreach_log
-- ✅ 3 opportunités avec outreach_sent = true
-- ✅ 3 opportunités avec status = 'contacted'
-- ✅ Dashboard affiche "3 emails envoyés"
-- =====================================================
