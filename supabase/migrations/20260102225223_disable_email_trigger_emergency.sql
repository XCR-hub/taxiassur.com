/*
  # URGENCE : Désactiver le trigger d'email immédiatement
  
  Le trigger send_lead_notification_emails() cause toujours une erreur :
  "unrecognized format() type specifier ","
  
  Le formulaire est CASSÉ - Désactivation immédiate
*/

-- Désactiver le trigger immédiatement
DROP TRIGGER IF EXISTS trigger_send_lead_emails ON leads;

COMMENT ON FUNCTION send_lead_notification_emails() IS 
'DÉSACTIVÉE - Erreur format() persistante. En cours de correction.';
