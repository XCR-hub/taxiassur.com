-- =====================================================
-- FIX BACKLINK : DÉBLOQUER L'ENVOI D'EMAILS
-- =====================================================
-- Problème : 16 opportunités avec email mais 0 envoyé
-- Cause : Status "new" au lieu de "pending"
-- =====================================================

-- ÉTAPE 1 : Changer "new" → "pending" (16 opportunités)
-- =====================================================
UPDATE backlink_opportunities
SET status = 'pending'
WHERE status = 'new' 
  AND contact_email IS NOT NULL 
  AND contact_email != '';

-- ÉTAPE 2 : Vérifier qu'on a bien des "pending" maintenant
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
-- pending  |   16  |     16
-- new      |   11  |      0

-- ÉTAPE 3 : Créer une campagne si elle n'existe pas
-- =====================================================
INSERT INTO backlink_campaigns (
  name, 
  status, 
  subject,
  sender_name,
  sender_email,
  total_recipients,
  sent_count,
  reply_count
) VALUES (
  'Campagne Backlinks TaxiAssur',
  'active',
  'Partenariat éditorial - TaxiAssur.com',
  'Équipe TaxiAssur',
  'contact@taxiassur.com',
  100,
  0,
  0
)
ON CONFLICT DO NOTHING;

-- Vérifier la campagne
SELECT id, name, status, sent_count 
FROM backlink_campaigns 
WHERE status = 'active';

-- ÉTAPE 4 : Créer un template d'email si manquant
-- =====================================================
INSERT INTO email_templates (
  name,
  subject,
  body,
  category
) VALUES (
  'Backlink Partnership Request',
  'Proposition de partenariat - TaxiAssur',
  '<p>Bonjour,</p>
  <p>Je suis tombé sur votre article <strong>{{article_title}}</strong> qui aborde {{topic}}.</p>
  <p>Nous sommes TaxiAssur, spécialiste de l''assurance pour taxis et VTC, et nous pensons qu''un partenariat éditorial pourrait intéresser vos lecteurs.</p>
  <p>Seriez-vous intéressé par :</p>
  <ul>
    <li>Un article invité de qualité sur l''assurance taxi</li>
    <li>Un échange de liens avec notre guide complet</li>
    <li>Une ressource à citer dans vos futurs articles</li>
  </ul>
  <p>Notre site : <a href="https://taxiassur.com">https://taxiassur.com</a></p>
  <p>Cordialement,<br>Équipe TaxiAssur</p>',
  'backlink_outreach'
)
ON CONFLICT DO NOTHING;

-- ÉTAPE 5 : AUTO-UPDATE STATUS pour les futurs scans
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

-- ÉTAPE 6 : TESTER L'ENVOI (envoie 3 emails)
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

-- ⏱️ ATTENDRE 30 SECONDES puis vérifier les logs

-- ÉTAPE 7 : VÉRIFIER LES RÉSULTATS
-- =====================================================

-- A) Logs d'envoi
SELECT 
  opportunity_id,
  email_sent,
  email_opened,
  email_replied,
  created_at
FROM backlink_outreach_log
ORDER BY created_at DESC
LIMIT 10;

-- B) Opportunités mises à jour
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

-- C) Statistiques globales
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
  COUNT(*) FILTER (WHERE outreach_sent = true) as emails_sent,
  COUNT(*) FILTER (WHERE backlink_received = true) as backlinks_won
FROM backlink_opportunities;

-- =====================================================
-- RÉSULTAT ATTENDU :
-- =====================================================
-- ✅ 16 opportunités passent en "pending"
-- ✅ 3 emails envoyés immédiatement
-- ✅ backlink_outreach_log contient 3 lignes
-- ✅ Dashboard affiche "3 emails envoyés"
-- =====================================================
