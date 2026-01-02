/*
  # FIX URGENT : Désactiver le trigger d'email qui casse le formulaire
  
  Le trigger send_lead_notification_emails() a une erreur SQL critique :
  - to_char() avec virgule dans format() cause "unrecognized format() type specifier"
  - Le formulaire principal ne peut plus créer de leads
  
  DÉSACTIVATION IMMÉDIATE du trigger pour débloquer le site
*/

-- Désactiver le trigger problématique
DROP TRIGGER IF EXISTS trigger_send_lead_emails ON leads;

-- Commenter la fonction (on la garde pour la corriger plus tard)
COMMENT ON FUNCTION send_lead_notification_emails() IS 
'DÉSACTIVÉE TEMPORAIREMENT - Erreur SQL avec to_char() et format(). Le trigger a été retiré pour permettre la création de leads.';
