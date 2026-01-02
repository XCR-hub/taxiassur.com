/*
  # Remove Unused Indexes - Batch 1

  ## Performance Optimization
  Removes unused indexes that consume storage and slow down INSERT/UPDATE operations.
  These indexes have not been used based on pg_stat_user_indexes analysis.
  
  ## Impact
  - Reduces storage overhead
  - Improves write performance
  - No impact on query performance (indexes are unused)
*/

-- Batch 1: WhatsApp and Client Management indexes
DROP INDEX IF EXISTS public.idx_wa_contacts_phone;
DROP INDEX IF EXISTS public.idx_wa_contacts_lead;
DROP INDEX IF EXISTS public.idx_wa_conversations_contact;
DROP INDEX IF EXISTS public.idx_wa_conversations_assigned;
DROP INDEX IF EXISTS public.idx_wa_conversations_last_msg;
DROP INDEX IF EXISTS public.idx_wa_messages_conversation;
DROP INDEX IF EXISTS public.idx_wa_messages_sid;
DROP INDEX IF EXISTS public.idx_wa_webhooks_processed;

-- Batch 2: Contract and Lead indexes
DROP INDEX IF EXISTS public.idx_contracts_lead;
DROP INDEX IF EXISTS public.idx_contracts_status;
DROP INDEX IF EXISTS public.idx_cross_sell_history;
DROP INDEX IF EXISTS public.idx_automation_rules_active;
DROP INDEX IF EXISTS public.idx_automation_history_lead;
DROP INDEX IF EXISTS public.idx_automation_history_rule;
DROP INDEX IF EXISTS public.idx_lead_activities_lead;
DROP INDEX IF EXISTS public.idx_lead_activities_type;
DROP INDEX IF EXISTS public.idx_scoring_rules_active;

-- Batch 3: Client Portal indexes
DROP INDEX IF EXISTS public.idx_client_invoices_contract_id;
DROP INDEX IF EXISTS public.idx_client_portal_users_contract_id;
DROP INDEX IF EXISTS public.idx_client_contracts_insurer_id;
DROP INDEX IF EXISTS public.idx_client_document_requests_client_id;
DROP INDEX IF EXISTS public.idx_client_document_requests_contract_id;
DROP INDEX IF EXISTS public.idx_client_document_requests_template_id;
DROP INDEX IF EXISTS public.idx_client_document_requests_validated_by;
DROP INDEX IF EXISTS public.idx_client_documents_contract_id;

-- Batch 4: CRM indexes
DROP INDEX IF EXISTS public.idx_crm_ai_suggestions_accepted_by;
DROP INDEX IF EXISTS public.idx_crm_call_recordings_interaction_id;
DROP INDEX IF EXISTS public.idx_crm_call_recordings_lead_id;
DROP INDEX IF EXISTS public.idx_crm_contracts_signed_lead_id;
DROP INDEX IF EXISTS public.idx_crm_contracts_signed_quote_id;
DROP INDEX IF EXISTS public.idx_crm_contracts_signed_signed_by;
DROP INDEX IF EXISTS public.idx_crm_documents_uploaded_by;
DROP INDEX IF EXISTS public.idx_crm_documents_validated_by;
DROP INDEX IF EXISTS public.idx_crm_interactions_created_by;
DROP INDEX IF EXISTS public.idx_crm_notifications_lead_id;
DROP INDEX IF EXISTS public.idx_crm_quotes_sent_insurer_id;
DROP INDEX IF EXISTS public.idx_crm_quotes_sent_sent_by;
DROP INDEX IF EXISTS public.idx_crm_tasks_assigned_by;