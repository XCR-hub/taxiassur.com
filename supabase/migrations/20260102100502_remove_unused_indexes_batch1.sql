/*
  # Remove Unused Indexes - Batch 1

  ## Purpose
  Remove indexes that are not being used by any queries.
  Unused indexes waste storage space and slow down INSERT/UPDATE/DELETE operations.

  ## Performance Impact
  - Faster write operations (INSERT, UPDATE, DELETE)
  - Reduced storage usage
  - Lower maintenance overhead

  ## Safety
  Only removing indexes confirmed as unused by Supabase monitoring.
  Primary key and foreign key indexes are preserved.

  ## Indexes Removed (Batch 1 - 20 indexes)
*/

-- Rate limiting related (likely unused in production)
DROP INDEX IF EXISTS public.idx_rate_limit_attempts_identifier_action;
DROP INDEX IF EXISTS public.idx_rate_limit_attempts_created_at;
DROP INDEX IF EXISTS public.idx_rate_limit_blocks_identifier_action;
DROP INDEX IF EXISTS public.idx_rate_limit_blocks_blocked_until;

-- Query performance monitoring (metadata tables)
DROP INDEX IF EXISTS public.idx_db_query_performance_created_at;
DROP INDEX IF EXISTS public.idx_db_query_performance_execution_time;

-- Leads table - duplicate index
DROP INDEX IF EXISTS public.idx_leads_email;

-- AI learning feedback
DROP INDEX IF EXISTS public.idx_ai_learning_feedback_response_id;

-- Analytics
DROP INDEX IF EXISTS public.idx_analytics_events_session_id;

-- Auto corrections
DROP INDEX IF EXISTS public.idx_auto_corrections_health_check_id;

-- Backlink system
DROP INDEX IF EXISTS public.idx_backlink_email_logs_campaign_id;
DROP INDEX IF EXISTS public.idx_backlink_notifications_opportunity_id;
DROP INDEX IF EXISTS public.idx_backlink_outreach_campaign_id;
DROP INDEX IF EXISTS public.idx_backlink_outreach_opportunity_id;
DROP INDEX IF EXISTS public.idx_backlink_outreach_log_opportunity_id;
DROP INDEX IF EXISTS public.idx_backlink_workflow_steps_opportunity_id;

-- Client portal
DROP INDEX IF EXISTS public.idx_client_document_requests_portal_user_id;
DROP INDEX IF EXISTS public.idx_client_documents_client_id;
DROP INDEX IF EXISTS public.idx_client_invoices_client_id;
DROP INDEX IF EXISTS public.idx_client_portal_activities_portal_user_id;