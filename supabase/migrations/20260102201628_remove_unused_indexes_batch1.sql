/*
  # Remove Unused Indexes - Batch 1
  
  This migration removes indexes that are not being used by any queries.
  This helps reduce storage overhead and improves write performance.
  
  ## Indexes Removed (Part 1/3)
  
  - leads: idx_leads_assigned_to_auth
  - crm_tasks: idx_crm_tasks_assigned_to_auth
  - ai_learning_feedback: idx_ai_learning_feedback_response_id
  - analytics_events: idx_analytics_events_session_id
  - auto_corrections: idx_auto_corrections_health_check_id
  - backlink_email_logs: idx_backlink_email_logs_campaign_id
  - backlink_notifications: idx_backlink_notifications_opportunity_id
  - backlink_outreach: idx_backlink_outreach_campaign_id, idx_backlink_outreach_opportunity_id
  - backlink_outreach_log: idx_backlink_outreach_log_opportunity_id
  - backlink_workflow_steps: idx_backlink_workflow_steps_opportunity_id
  - client_document_requests: idx_client_document_requests_portal_user_id
  - client_documents: idx_client_documents_client_id
  - client_invoices: idx_client_invoices_client_id
  - client_portal_activities: idx_client_portal_activities_portal_user_id
  - crm_ai_suggestions: idx_crm_ai_suggestions_lead_id
  - content_generation_history: idx_content_generation_history_schedule_id
  - conversion_funnel: idx_conversion_funnel_session_id
*/

DROP INDEX IF EXISTS public.idx_leads_assigned_to_auth;
DROP INDEX IF EXISTS public.idx_crm_tasks_assigned_to_auth;
DROP INDEX IF EXISTS public.idx_ai_learning_feedback_response_id;
DROP INDEX IF EXISTS public.idx_analytics_events_session_id;
DROP INDEX IF EXISTS public.idx_auto_corrections_health_check_id;
DROP INDEX IF EXISTS public.idx_backlink_email_logs_campaign_id;
DROP INDEX IF EXISTS public.idx_backlink_notifications_opportunity_id;
DROP INDEX IF EXISTS public.idx_backlink_outreach_campaign_id;
DROP INDEX IF EXISTS public.idx_backlink_outreach_opportunity_id;
DROP INDEX IF EXISTS public.idx_backlink_outreach_log_opportunity_id;
DROP INDEX IF EXISTS public.idx_backlink_workflow_steps_opportunity_id;
DROP INDEX IF EXISTS public.idx_client_document_requests_portal_user_id;
DROP INDEX IF EXISTS public.idx_client_documents_client_id;
DROP INDEX IF EXISTS public.idx_client_invoices_client_id;
DROP INDEX IF EXISTS public.idx_client_portal_activities_portal_user_id;
DROP INDEX IF EXISTS public.idx_crm_ai_suggestions_lead_id;
DROP INDEX IF EXISTS public.idx_content_generation_history_schedule_id;
DROP INDEX IF EXISTS public.idx_conversion_funnel_session_id;
