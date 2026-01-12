/*
  # Fix Webhook Errors and Disable Old Triggers

  ## Problème
  - Des triggers sur table 'leads' appellent des webhooks qui échouent
  - Ces triggers bloquent l'insertion de leads
  - Webhook timeout ou échecs causent des erreurs

  ## Solution
  - Désactiver les triggers sur table 'leads' (ancienne table)
  - S'assurer qu'ils n'existent pas non plus sur crm_leads
  - Les notifications seront gérées différemment (via queue)

  ## Sécurité
  - Pas d'impact sur les données existantes
  - Les leads peuvent être créés sans blocage
*/

-- Désactiver le trigger Brevo sur leads
DROP TRIGGER IF EXISTS trigger_send_lead_email_brevo ON leads;
DROP TRIGGER IF EXISTS on_lead_inserted_send_email_ionos ON leads;

-- Désactiver aussi sur crm_leads si existe
DROP TRIGGER IF EXISTS trigger_send_lead_email_brevo ON crm_leads;
DROP TRIGGER IF EXISTS on_lead_inserted_send_email_ionos ON crm_leads;

-- S'assurer qu'il n'y a pas de trigger document qui pourrait échouer
DROP TRIGGER IF EXISTS trigger_send_document_notification ON prospect_documents;
DROP TRIGGER IF EXISTS handle_document_upload_trigger ON prospect_documents;

-- Commentaire pour traçabilité
COMMENT ON TABLE leads IS 'Table leads dépréciée. Utiliser crm_leads. Triggers webhooks désactivés pour éviter les erreurs.';
COMMENT ON TABLE crm_leads IS 'Table principale des leads CRM. Notifications gérées via crm_notification_queue, pas par webhooks directs.';
COMMENT ON TABLE prospect_documents IS 'Documents prospects. Trigger document désactivé pour éviter timeouts. Notifications via crm_notification_queue.';

-- Log de l'action
DO $$
BEGIN
  RAISE NOTICE 'Triggers webhooks désactivés avec succès';
  RAISE NOTICE 'leads: trigger_send_lead_email_brevo, on_lead_inserted_send_email_ionos';
  RAISE NOTICE 'prospect_documents: trigger_send_document_notification';
END $$;
