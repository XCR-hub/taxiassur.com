/*
  # Fix Unindexed Foreign Keys - Batch 1

  ## Purpose
  Add missing indexes on foreign key columns to improve query performance.
  Foreign keys without indexes cause table scans on JOIN operations.

  ## Tables Fixed (Batch 1 - 15 tables)
  1. admin_users - created_by
  2. ai_comments_published - response_id
  3. client_contracts - insurer_id
  4. client_document_requests - client_id, contract_id, template_id, validated_by
  5. client_documents - contract_id
  6. client_invoices - contract_id
  7. client_portal_users - contract_id
  8. crm_ai_suggestions - accepted_by
  9. crm_automation_history - lead_id, rule_id
  10. crm_call_recordings - interaction_id, lead_id
  11. crm_contracts_signed - lead_id, quote_id, signed_by
  12. crm_documents - uploaded_by, validated_by
  13. crm_interactions - created_by
  14. crm_lead_activities - lead_id
  15. crm_notifications - lead_id

  ## Performance Impact
  - Speeds up JOIN queries significantly
  - Reduces table scans
  - Improves foreign key constraint checks on UPDATE/DELETE
*/

-- admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_created_by 
  ON public.admin_users(created_by);

-- ai_comments_published
CREATE INDEX IF NOT EXISTS idx_ai_comments_published_response_id 
  ON public.ai_comments_published(response_id);

-- client_contracts
CREATE INDEX IF NOT EXISTS idx_client_contracts_insurer_id 
  ON public.client_contracts(insurer_id);

-- client_document_requests
CREATE INDEX IF NOT EXISTS idx_client_document_requests_client_id_fk 
  ON public.client_document_requests(client_id);

CREATE INDEX IF NOT EXISTS idx_client_document_requests_contract_id_fk 
  ON public.client_document_requests(contract_id);

CREATE INDEX IF NOT EXISTS idx_client_document_requests_template_id_fk 
  ON public.client_document_requests(template_id);

CREATE INDEX IF NOT EXISTS idx_client_document_requests_validated_by_fk 
  ON public.client_document_requests(validated_by);

-- client_documents
CREATE INDEX IF NOT EXISTS idx_client_documents_contract_id_fk 
  ON public.client_documents(contract_id);

-- client_invoices
CREATE INDEX IF NOT EXISTS idx_client_invoices_contract_id_fk 
  ON public.client_invoices(contract_id);

-- client_portal_users
CREATE INDEX IF NOT EXISTS idx_client_portal_users_contract_id_fk 
  ON public.client_portal_users(contract_id);

-- crm_ai_suggestions
CREATE INDEX IF NOT EXISTS idx_crm_ai_suggestions_accepted_by_fk 
  ON public.crm_ai_suggestions(accepted_by);

-- crm_automation_history
CREATE INDEX IF NOT EXISTS idx_crm_automation_history_lead_id_fk 
  ON public.crm_automation_history(lead_id);

CREATE INDEX IF NOT EXISTS idx_crm_automation_history_rule_id_fk 
  ON public.crm_automation_history(rule_id);

-- crm_call_recordings
CREATE INDEX IF NOT EXISTS idx_crm_call_recordings_interaction_id_fk 
  ON public.crm_call_recordings(interaction_id);

CREATE INDEX IF NOT EXISTS idx_crm_call_recordings_lead_id_fk 
  ON public.crm_call_recordings(lead_id);

-- crm_contracts_signed
CREATE INDEX IF NOT EXISTS idx_crm_contracts_signed_lead_id_fk 
  ON public.crm_contracts_signed(lead_id);

CREATE INDEX IF NOT EXISTS idx_crm_contracts_signed_quote_id_fk 
  ON public.crm_contracts_signed(quote_id);

CREATE INDEX IF NOT EXISTS idx_crm_contracts_signed_signed_by_fk 
  ON public.crm_contracts_signed(signed_by);

-- crm_documents
CREATE INDEX IF NOT EXISTS idx_crm_documents_uploaded_by_fk 
  ON public.crm_documents(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_crm_documents_validated_by_fk 
  ON public.crm_documents(validated_by);

-- crm_interactions
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_by_fk 
  ON public.crm_interactions(created_by);

-- crm_lead_activities
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_lead_id_fk 
  ON public.crm_lead_activities(lead_id);

-- crm_notifications
CREATE INDEX IF NOT EXISTS idx_crm_notifications_lead_id_fk 
  ON public.crm_notifications(lead_id);