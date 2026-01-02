/*
  # Remove Unused Indexes - Batch 3 (Final)

  ## Performance Optimization
  Final batch of unused index removal.
*/

-- Batch 11: Lead Management indexes
DROP INDEX IF EXISTS public.idx_lead_documents_lead;
DROP INDEX IF EXISTS public.idx_lead_documents_status;
DROP INDEX IF EXISTS public.idx_pipeline_history_lead;
DROP INDEX IF EXISTS public.idx_communications_lead;
DROP INDEX IF EXISTS public.idx_communications_status;
DROP INDEX IF EXISTS public.idx_communications_channel;
DROP INDEX IF EXISTS public.idx_reminders_lead;
DROP INDEX IF EXISTS public.idx_reminders_scheduled;
DROP INDEX IF EXISTS public.idx_quotes_lead;
DROP INDEX IF EXISTS public.idx_quotes_status;
DROP INDEX IF EXISTS public.idx_payments_lead;
DROP INDEX IF EXISTS public.idx_payments_status;

-- Batch 12: Admin and Monitoring indexes  
DROP INDEX IF EXISTS public.idx_admin_users_created_by;
DROP INDEX IF EXISTS public.idx_db_query_performance_table_name;
DROP INDEX IF EXISTS public.idx_db_table_stats_table_name;
DROP INDEX IF EXISTS public.idx_db_table_stats_updated_at;
DROP INDEX IF EXISTS public.idx_db_index_usage_table_name;
DROP INDEX IF EXISTS public.idx_db_index_usage_usage_percentage;
DROP INDEX IF EXISTS public.idx_db_connection_pool_created_at;
DROP INDEX IF EXISTS public.idx_db_slow_queries_log_detected_at;
DROP INDEX IF EXISTS public.idx_db_slow_queries_log_execution_time;

-- Batch 13: Webhook and Rate Limiting indexes
DROP INDEX IF EXISTS public.idx_webhook_logs_source;
DROP INDEX IF EXISTS public.idx_webhook_logs_received_at;
DROP INDEX IF EXISTS public.idx_webhook_logs_valid;
DROP INDEX IF EXISTS public.idx_webhook_logs_status;
DROP INDEX IF EXISTS public.idx_rate_limit_blocks_identifier;
DROP INDEX IF EXISTS public.idx_global_rate_limits_identifier_path;
DROP INDEX IF EXISTS public.idx_global_rate_limits_created_at;

-- Batch 14: Audit and Features indexes
DROP INDEX IF EXISTS public.idx_audit_logs_resource;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at;
DROP INDEX IF EXISTS public.idx_audit_logs_status;
DROP INDEX IF EXISTS public.idx_audit_logs_user_id;
DROP INDEX IF EXISTS public.idx_audit_logs_user_email;
DROP INDEX IF EXISTS public.idx_audit_logs_action;
DROP INDEX IF EXISTS public.idx_feature_flags_key;
DROP INDEX IF EXISTS public.idx_feature_flags_enabled;
DROP INDEX IF EXISTS public.idx_feature_flags_environment;
DROP INDEX IF EXISTS public.idx_feature_flag_overrides_flag_key;
DROP INDEX IF EXISTS public.idx_feature_flag_overrides_user_id;
DROP INDEX IF EXISTS public.idx_feature_flag_overrides_user_email;

-- Batch 15: Content indexes
DROP INDEX IF EXISTS public.idx_news_articles_title_search;
DROP INDEX IF EXISTS public.idx_blog_posts_title_search;
DROP INDEX IF EXISTS public.idx_blog_posts_content_search;

-- Batch 16: Leads base table (keep email for lookups, only drop if truly unused)
-- DROP INDEX IF EXISTS public.idx_leads_email; -- KEEP THIS ONE, email lookups are common