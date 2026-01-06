/*
  # Remove All Duplicate Indexes - Batch 1

  1. Changes
    - Removes duplicate foreign key indexes (_fk suffix)
    - Keeps original indexes without suffix
    - Improves write performance

  2. Tables Affected (Batch 1 - 19 tables)
    - admin_notifications through crm_automation_triggers

  3. Performance Impact
    - Reduces index maintenance overhead
    - Speeds up INSERT/UPDATE/DELETE operations
    - Frees up storage space
*/

DROP INDEX IF EXISTS public.idx_admin_notifications_document_id_fk;
DROP INDEX IF EXISTS public.idx_ai_learning_feedback_response_id_fk;
DROP INDEX IF EXISTS public.idx_analytics_events_session_id_fk;
DROP INDEX IF EXISTS public.idx_auto_corrections_health_check_id_fk;
DROP INDEX IF EXISTS public.idx_backlink_email_logs_campaign_id_fk;
DROP INDEX IF EXISTS public.idx_backlink_notifications_opportunity_id_fk;
DROP INDEX IF EXISTS public.idx_backlink_outreach_campaign_id_fk;
DROP INDEX IF EXISTS public.idx_backlink_outreach_opportunity_id_fk;
DROP INDEX IF EXISTS public.idx_backlink_outreach_log_opportunity_id_fk;
DROP INDEX IF EXISTS public.idx_backlink_workflow_steps_opportunity_id_fk;
DROP INDEX IF EXISTS public.idx_client_document_requests_portal_user_id_fk;
DROP INDEX IF EXISTS public.idx_client_documents_client_id_fk;
DROP INDEX IF EXISTS public.idx_client_invoices_client_id_fk;
DROP INDEX IF EXISTS public.idx_client_portal_activities_portal_user_id_fk;
DROP INDEX IF EXISTS public.idx_content_generation_history_schedule_id_fk;
DROP INDEX IF EXISTS public.idx_conversion_funnel_session_id_fk;
DROP INDEX IF EXISTS public.idx_crm_ai_suggestions_lead_id_fk;
DROP INDEX IF EXISTS public.idx_crm_automation_rules_created_by_fk;
DROP INDEX IF EXISTS public.idx_crm_automation_triggers_automation_rule_id_fk;
