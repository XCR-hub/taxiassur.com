/*
  # Remove Unused Indexes - Batch 2

  ## Indexes Removed (Batch 2 - 30 indexes)
*/

-- Content generation
DROP INDEX IF EXISTS public.idx_content_generation_history_schedule_id;

-- Conversion funnel
DROP INDEX IF EXISTS public.idx_conversion_funnel_session_id;

-- CRM indexes
DROP INDEX IF EXISTS public.idx_crm_ai_suggestions_lead_id;
DROP INDEX IF EXISTS public.idx_crm_automation_rules_created_by;
DROP INDEX IF EXISTS public.idx_crm_automation_triggers_automation_rule_id;
DROP INDEX IF EXISTS public.idx_crm_contracts_signed_insurer_id;
DROP INDEX IF EXISTS public.idx_crm_documents_lead_id;
DROP INDEX IF EXISTS public.idx_crm_email_analytics_interaction_id;
DROP INDEX IF EXISTS public.idx_crm_email_analytics_lead_id;
DROP INDEX IF EXISTS public.idx_crm_interactions_lead_id;
DROP INDEX IF EXISTS public.idx_crm_notifications_user_id;
DROP INDEX IF EXISTS public.idx_crm_quotes_sent_lead_id;
DROP INDEX IF EXISTS public.idx_crm_tasks_assigned_to;
DROP INDEX IF EXISTS public.idx_crm_tasks_lead_id;

-- Cross sell
DROP INDEX IF EXISTS public.idx_cross_sell_history_campaign_id;
DROP INDEX IF EXISTS public.idx_cross_sell_opportunities_client_id;

-- Documents
DROP INDEX IF EXISTS public.idx_document_templates_category_id;

-- Email
DROP INDEX IF EXISTS public.idx_email_responses_inbox_id;

-- Lead management
DROP INDEX IF EXISTS public.idx_lead_communications_parent_communication_id;
DROP INDEX IF EXISTS public.idx_lead_contracts_payment_id;
DROP INDEX IF EXISTS public.idx_lead_contracts_quote_id;
DROP INDEX IF EXISTS public.idx_lead_payments_quote_id;
DROP INDEX IF EXISTS public.idx_lead_pipeline_history_stage_id;

-- Partners
DROP INDEX IF EXISTS public.idx_partner_analytics_partner_id;
DROP INDEX IF EXISTS public.idx_partner_interactions_partner_id;

-- Pinterest
DROP INDEX IF EXISTS public.idx_pinterest_performance_tracking_post_id;

-- Post generation
DROP INDEX IF EXISTS public.idx_post_generation_logs_post_id;
DROP INDEX IF EXISTS public.idx_post_generation_logs_template_id;

-- Quote requests
DROP INDEX IF EXISTS public.idx_quote_requests_session_id;

-- Referrals
DROP INDEX IF EXISTS public.idx_referrals_ambassador_id;