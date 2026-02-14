/*
  # Restauration Workflow Prospect ↔ CRM - Étape 2: Triggers
  
  Active tous les triggers pour le workflow complet
*/

-- =============================================
-- 1. TRIGGER: Upload document
-- =============================================

DROP TRIGGER IF EXISTS notify_document_upload_trigger ON crm_lead_documents;

CREATE TRIGGER notify_document_upload_trigger
AFTER INSERT ON crm_lead_documents
FOR EACH ROW
EXECUTE FUNCTION notify_document_upload();

-- =============================================
-- 2. TRIGGER: Validation document
-- =============================================

DROP TRIGGER IF EXISTS notify_document_validation_trigger ON crm_lead_documents;

CREATE TRIGGER notify_document_validation_trigger
AFTER UPDATE ON crm_lead_documents
FOR EACH ROW
EXECUTE FUNCTION notify_document_validation();

-- =============================================
-- 3. TRIGGER: Changement statut devis
-- =============================================

DROP TRIGGER IF EXISTS notify_quote_status_change_trigger ON lead_company_quotes;

CREATE TRIGGER notify_quote_status_change_trigger
AFTER UPDATE ON lead_company_quotes
FOR EACH ROW
EXECUTE FUNCTION notify_quote_status_change();

-- Commentaires
COMMENT ON TRIGGER notify_document_upload_trigger ON crm_lead_documents IS 
'Workflow: prospect upload → notif CRM, commercial upload → email prospect';

COMMENT ON TRIGGER notify_document_validation_trigger ON crm_lead_documents IS 
'Envoie email au prospect quand le commercial valide un document';

COMMENT ON TRIGGER notify_quote_status_change_trigger ON lead_company_quotes IS 
'Notifie le commercial quand le prospect accepte/refuse un devis';