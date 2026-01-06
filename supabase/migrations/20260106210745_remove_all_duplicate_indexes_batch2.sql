/*
  # Remove All Duplicate Indexes - Batch 2

  1. Changes
    - Continues removing duplicate foreign key indexes
    - Tables: crm_contracts_signed through lead_contracts

  2. Tables Affected (Batch 2 - 14 tables with some having 2 duplicates)
*/

DROP INDEX IF EXISTS public.idx_crm_contracts_signed_insurer_id_fk;
DROP INDEX IF EXISTS public.idx_crm_documents_lead_id_fk;
DROP INDEX IF EXISTS public.idx_crm_email_analytics_interaction_id_fk;
DROP INDEX IF EXISTS public.idx_crm_email_analytics_lead_id_fk;
DROP INDEX IF EXISTS public.idx_crm_interactions_lead_id_fk;
DROP INDEX IF EXISTS public.idx_crm_notifications_user_id_fk;
DROP INDEX IF EXISTS public.idx_crm_quotes_sent_lead_id_fk;
DROP INDEX IF EXISTS public.idx_crm_tasks_assigned_to_fk;
DROP INDEX IF EXISTS public.idx_crm_tasks_lead_id_fk;
DROP INDEX IF EXISTS public.idx_cross_sell_history_campaign_id_fk;
DROP INDEX IF EXISTS public.idx_cross_sell_opportunities_client_id_fk;
DROP INDEX IF EXISTS public.idx_document_templates_category_id_fk;
DROP INDEX IF EXISTS public.idx_email_responses_inbox_id_fk;
DROP INDEX IF EXISTS public.idx_lead_communications_parent_communication_id_fk;
DROP INDEX IF EXISTS public.idx_lead_company_quotes_submitted_by_fk;
DROP INDEX IF EXISTS public.idx_lead_contracts_payment_id_fk;
DROP INDEX IF EXISTS public.idx_lead_contracts_quote_id_fk;
