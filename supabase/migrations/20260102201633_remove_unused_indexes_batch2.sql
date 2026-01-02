/*
  # Remove Unused Indexes - Batch 2
  
  This migration removes indexes that are not being used by any queries.
  
  ## Indexes Removed (Part 2/3)
  
  - crm_automation_rules: idx_crm_automation_rules_created_by
  - crm_automation_triggers: idx_crm_automation_triggers_automation_rule_id
  - crm_contracts_signed: idx_crm_contracts_signed_insurer_id
  - crm_documents: idx_crm_documents_lead_id
  - crm_email_analytics: idx_crm_email_analytics_interaction_id, idx_crm_email_analytics_lead_id
  - crm_interactions: idx_crm_interactions_lead_id
  - crm_notifications: idx_crm_notifications_user_id
  - crm_quotes_sent: idx_crm_quotes_sent_lead_id
  - crm_tasks: idx_crm_tasks_lead_id
  - cross_sell_history: idx_cross_sell_history_campaign_id
  - cross_sell_opportunities: idx_cross_sell_opportunities_client_id
  - document_templates: idx_document_templates_category_id
  - email_responses: idx_email_responses_inbox_id
  - lead_communications: idx_lead_communications_parent_communication_id
  - lead_contracts: idx_lead_contracts_payment_id, idx_lead_contracts_quote_id
  - lead_payments: idx_lead_payments_quote_id
  - lead_pipeline_history: idx_lead_pipeline_history_stage_id
*/

DROP INDEX IF EXISTS public.idx_crm_automation_rules_created_by;
DROP INDEX IF EXISTS public.idx_crm_automation_triggers_automation_rule_id;
DROP INDEX IF EXISTS public.idx_crm_contracts_signed_insurer_id;
DROP INDEX IF EXISTS public.idx_crm_documents_lead_id;
DROP INDEX IF EXISTS public.idx_crm_email_analytics_interaction_id;
DROP INDEX IF EXISTS public.idx_crm_email_analytics_lead_id;
DROP INDEX IF EXISTS public.idx_crm_interactions_lead_id;
DROP INDEX IF EXISTS public.idx_crm_notifications_user_id;
DROP INDEX IF EXISTS public.idx_crm_quotes_sent_lead_id;
DROP INDEX IF EXISTS public.idx_crm_tasks_lead_id;
DROP INDEX IF EXISTS public.idx_cross_sell_history_campaign_id;
DROP INDEX IF EXISTS public.idx_cross_sell_opportunities_client_id;
DROP INDEX IF EXISTS public.idx_document_templates_category_id;
DROP INDEX IF EXISTS public.idx_email_responses_inbox_id;
DROP INDEX IF EXISTS public.idx_lead_communications_parent_communication_id;
DROP INDEX IF EXISTS public.idx_lead_contracts_payment_id;
DROP INDEX IF EXISTS public.idx_lead_contracts_quote_id;
DROP INDEX IF EXISTS public.idx_lead_payments_quote_id;
DROP INDEX IF EXISTS public.idx_lead_pipeline_history_stage_id;
