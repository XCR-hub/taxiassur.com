-- ========================================
-- 🧪 TEST RAPIDE - Email Prospect
-- ========================================
-- Date: 5 mars 2026
-- Objectif: Vérifier que les emails partent bien
-- ========================================

-- ✅ ÉTAPE 1: Créer un lead de test
-- ⚠️ Remplacez "VOTRE_EMAIL@gmail.com" par votre vraie adresse

INSERT INTO crm_leads (
  first_name,
  last_name,
  full_name,
  email,
  phone,
  city,
  status,
  source
) VALUES (
  'Test',
  'Prospect',
  'Test Prospect',
  'VOTRE_EMAIL@gmail.com',  -- ⚠️ MODIFIER ICI
  '0601020304',
  'Paris',
  'nouveau_lead',
  'test_manuel'
)
RETURNING
  id,
  email,
  access_token,
  created_at;

-- 📋 Copier l'ID du lead retourné ci-dessus


-- ========================================
-- ✅ ÉTAPE 2: Vérifier que l'email a été ajouté à la queue
-- Attendre 2-3 secondes puis exécuter:
-- ========================================

SELECT
  id,
  email_type,
  to_email,
  subject,
  status,
  created_at,
  sent_at,
  retry_count,
  error_message
FROM email_queue
WHERE lead_id = 'ID_DU_LEAD_COPIÉ'  -- ⚠️ REMPLACER PAR L'ID DU LEAD
ORDER BY created_at DESC;

-- Résultat attendu:
-- - 2 lignes (1 pour l'équipe, 1 pour le client)
-- - status = 'pending' (si < 1 minute)
-- - status = 'sent' (si > 1 minute)


-- ========================================
-- ✅ ÉTAPE 3: Attendre 60 secondes puis vérifier l'envoi
-- ========================================

SELECT
  id,
  email_type,
  to_email,
  subject,
  status,
  sent_at,
  error_message
FROM email_queue
WHERE lead_id = 'ID_DU_LEAD_COPIÉ'  -- ⚠️ REMPLACER PAR L'ID DU LEAD
ORDER BY created_at DESC;

-- Résultat attendu:
-- - status = 'sent' ✅
-- - sent_at = timestamp récent
-- - error_message = NULL


-- ========================================
-- ✅ ÉTAPE 4: Vérifier votre boîte mail
-- ========================================

-- Objet de l'email:
-- "✅ Votre demande de devis TaxiAssur bien reçue"
--
-- Si pas reçu après 5 minutes:
-- 1. Vérifier le dossier SPAM
-- 2. Chercher "TaxiAssur" ou "team@taxiassur.com"
-- 3. Vérifier que l'email dans la base est correct


-- ========================================
-- 🔍 DIAGNOSTIC SI PROBLÈME
-- ========================================

-- Voir tous les emails en attente ou échoués
SELECT
  id,
  email_type,
  to_email,
  status,
  error_message,
  retry_count,
  created_at
FROM email_queue
WHERE status IN ('pending', 'failed', 'retry')
ORDER BY created_at DESC
LIMIT 20;


-- Voir les derniers emails envoyés
SELECT
  id,
  email_type,
  to_email,
  status,
  sent_at,
  created_at
FROM email_queue
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 10;


-- Vérifier que le cron est actif
SELECT
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname = 'process-email-queue-simple';

-- Résultat attendu:
-- jobname: process-email-queue-simple
-- schedule: * * * * * (chaque minute)
-- active: true


-- ========================================
-- 🚀 FORCER L'ENVOI IMMÉDIAT (Si besoin)
-- ========================================

-- Traiter manuellement la queue (au lieu d'attendre le cron)
SELECT process_email_queue_simple(20);

-- Résultat:
-- {"processed": X, "failed": Y, "timestamp": "..."}


-- ========================================
-- 🧹 NETTOYER LE TEST
-- ========================================

-- Supprimer le lead de test (optionnel)
DELETE FROM crm_leads
WHERE email = 'VOTRE_EMAIL@gmail.com'  -- ⚠️ MODIFIER
AND source = 'test_manuel';

-- Les emails associés seront automatiquement supprimés (CASCADE)


-- ========================================
-- ✅ RÉSULTAT ATTENDU
-- ========================================

/*
Timeline complète:

00:00:00 → Lead créé
00:00:01 → 2 emails ajoutés à email_queue (status: pending)
00:01:00 → Cron process-email-queue-simple s'exécute
00:01:05 → Emails envoyés via IONOS (status: sent)
00:01:30 → Email arrive dans la boîte mail

TOTAL: 1 à 2 minutes max
*/
