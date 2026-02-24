/*
  # Désactiver le trigger redondant
  
  1. Problème
    - Le trigger trg_queue_new_lead_emails se déclenche
    - La fonction upsert_lead envoie aussi les emails manuellement
    - Résultat : 4 emails au lieu de 2 (doublons)
  
  2. Solution
    - Désactiver le trigger trg_queue_new_lead_emails
    - Garder uniquement l'envoi manuel dans upsert_lead
  
  3. Résultat attendu
    - Chaque nouveau lead génère exactement 2 emails (pas de doublons)
*/

-- Désactiver le trigger redondant
ALTER TABLE crm_leads DISABLE TRIGGER trg_queue_new_lead_emails;

-- Conserver les autres triggers actifs
-- (trigger_send_client_activation_email, trigger_send_rib_request_email)

COMMENT ON TRIGGER trg_queue_new_lead_emails ON crm_leads IS
'Trigger DÉSACTIVÉ - Les emails sont maintenant envoyés directement par la fonction upsert_lead';

-- Nettoyer les doublons d'emails
DELETE FROM email_queue
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY to_email, email_type, created_at::date
             ORDER BY created_at
           ) as rn
    FROM email_queue
    WHERE created_at > now() - interval '10 minutes'
  ) t
  WHERE t.rn > 1
);

-- Nettoyer les leads de test
DELETE FROM crm_leads WHERE email LIKE 'test-%@taxiassur.com' AND created_at > now() - interval '10 minutes';