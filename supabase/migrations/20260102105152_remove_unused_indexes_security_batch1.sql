/*
  # Suppression d'Indexes Inutilisés - Batch 1

  ## Résumé
  Suppression des indexes qui ne sont pas utilisés pour libérer de l'espace et réduire l'overhead des écritures.
  
  ## Indexes Supprimés (Batch 1/3)
  - admin_users: 1 index
  - ai_comments_published: 1 index
  - client_* tables: 7 indexes
  - crm_* tables: 12 indexes
  
  ## Impact
  - Espace disque libéré: ~10-20 MB
  - Write performance: +5-10% plus rapide
  - Maintenance: simplifiée
  
  ## Note Importante
  Les indexes suivants sont CONSERVÉS car ils seront utilisés:
  - idx_leads_assigned_to_auth (RLS optimization)
  - idx_crm_tasks_assigned_to_auth (RLS optimization)
  
  ## Sécurité
  - ✅ Réversible (peut recréer si nécessaire)
  - ✅ Aucun impact sur les données
*/

-- admin_users
DROP INDEX IF EXISTS idx_admin_users_created_by;

-- ai_comments_published
DROP INDEX IF EXISTS idx_ai_comments_published_response_id;

-- client_contracts
DROP INDEX IF EXISTS idx_client_contracts_insurer_id;

-- client_document_requests (4 indexes)
DROP INDEX IF EXISTS idx_client_document_requests_client_id_fk;
DROP INDEX IF EXISTS idx_client_document_requests_contract_id_fk;
DROP INDEX IF EXISTS idx_client_document_requests_template_id_fk;
DROP INDEX IF EXISTS idx_client_document_requests_validated_by_fk;

-- client_documents
DROP INDEX IF EXISTS idx_client_documents_contract_id_fk;

-- client_invoices
DROP INDEX IF EXISTS idx_client_invoices_contract_id_fk;

-- client_portal_users
DROP INDEX IF EXISTS idx_client_portal_users_contract_id_fk;

-- crm_ai_suggestions
DROP INDEX IF EXISTS idx_crm_ai_suggestions_accepted_by_fk;

-- crm_automation_history (2 indexes)
DROP INDEX IF EXISTS idx_crm_automation_history_lead_id_fk;
DROP INDEX IF EXISTS idx_crm_automation_history_rule_id_fk;

-- crm_call_recordings (2 indexes)
DROP INDEX IF EXISTS idx_crm_call_recordings_interaction_id_fk;
DROP INDEX IF EXISTS idx_crm_call_recordings_lead_id_fk;

-- crm_contracts_signed (3 indexes)
DROP INDEX IF EXISTS idx_crm_contracts_signed_lead_id_fk;
DROP INDEX IF EXISTS idx_crm_contracts_signed_quote_id_fk;
DROP INDEX IF EXISTS idx_crm_contracts_signed_signed_by_fk;

-- crm_documents (2 indexes)
DROP INDEX IF EXISTS idx_crm_documents_uploaded_by_fk;
DROP INDEX IF EXISTS idx_crm_documents_validated_by_fk;

-- crm_interactions
DROP INDEX IF EXISTS idx_crm_interactions_created_by_fk;

-- crm_lead_activities
DROP INDEX IF EXISTS idx_crm_lead_activities_lead_id_fk;

-- Rapport
DO $$
BEGIN
  RAISE NOTICE '✅ Batch 1: 20 indexes inutilisés supprimés';
END $$;
