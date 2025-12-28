/*
  # Fix Security & Performance Issues - Part 1: Indexes

  ## Changes
  
  ### 1. Add Missing Foreign Key Indexes
  Creates indexes on all foreign keys without covering indexes for optimal query performance.
  
  ### 2. Remove Unused Indexes
  Drops indexes that have never been used according to pg_stat_user_indexes.
  
  ### 3. Remove Duplicate Indexes
  Drops duplicate indexes keeping only one of each set (excluding constraint indexes).
  
  ### 4. Fix Primary Key Issue
  Adds primary key to leads_backup table.
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_admin_users_created_by ON public.admin_users(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_comments_response_id ON public.ai_comments_published(response_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_feedback_response ON public.ai_learning_feedback(response_id);
CREATE INDEX IF NOT EXISTS idx_backlink_email_campaign ON public.backlink_email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_backlink_notifications_opportunity ON public.backlink_notifications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_campaign ON public.backlink_outreach(campaign_id);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_opportunity_fk ON public.backlink_outreach(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_backlink_workflow_opportunity ON public.backlink_workflow_steps(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_email_responses_inbox ON public.email_responses(inbox_id);
CREATE INDEX IF NOT EXISTS idx_pinterest_tracking_post ON public.pinterest_performance_tracking(post_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_session ON public.quote_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_by ON public.social_posts(created_by);

-- =====================================================
-- 2. DROP UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS public.idx_ugc_status;
DROP INDEX IF EXISTS public.idx_ugc_type;
DROP INDEX IF EXISTS public.idx_conversion_funnel_session;
DROP INDEX IF EXISTS public.idx_conversion_funnel_step;
DROP INDEX IF EXISTS public.idx_email_inbox_intent;
DROP INDEX IF EXISTS public.idx_email_inbox_processed;
DROP INDEX IF EXISTS public.idx_email_inbox_from_email;
DROP INDEX IF EXISTS public.idx_lead_follow_ups_next_date;
DROP INDEX IF EXISTS public.idx_lead_follow_ups_status;
DROP INDEX IF EXISTS public.post_generation_logs_template_id_idx;
DROP INDEX IF EXISTS public.idx_seo_ping_engine;
DROP INDEX IF EXISTS public.idx_seo_ping_created;
DROP INDEX IF EXISTS public.idx_outreach_campaigns_status;
DROP INDEX IF EXISTS public.idx_competitor_monitoring_checked;
DROP INDEX IF EXISTS public.idx_content_opportunities_keyword;
DROP INDEX IF EXISTS public.idx_seo_webhook_processed;
DROP INDEX IF EXISTS public.idx_seo_webhook_source;
DROP INDEX IF EXISTS public.page_views_viewed_at_idx;
DROP INDEX IF EXISTS public.page_views_page_url_idx;
DROP INDEX IF EXISTS public.page_views_session_id_idx;
DROP INDEX IF EXISTS public.idx_performance_metrics_type;
DROP INDEX IF EXISTS public.idx_performance_metrics_created;
DROP INDEX IF EXISTS public.news_articles_published_at_idx;
DROP INDEX IF EXISTS public.news_articles_search_idx;
DROP INDEX IF EXISTS public.idx_email_queue_status_priority;
DROP INDEX IF EXISTS public.idx_email_queue_scheduled;
DROP INDEX IF EXISTS public.ai_learning_created_at_idx;
DROP INDEX IF EXISTS public.ai_learning_applied_idx;
DROP INDEX IF EXISTS public.idx_social_networks_name;
DROP INDEX IF EXISTS public.idx_automation_config_name;
DROP INDEX IF EXISTS public.idx_automation_config_enabled;
DROP INDEX IF EXISTS public.idx_automation_config_next_run;
DROP INDEX IF EXISTS public.idx_faq_entries_order;
DROP INDEX IF EXISTS public.idx_faq_entries_category;
DROP INDEX IF EXISTS public.idx_social_posts_ai_generated;
DROP INDEX IF EXISTS public.idx_social_posts_viral_score;
DROP INDEX IF EXISTS public.idx_social_posts_scheduled;
DROP INDEX IF EXISTS public.idx_backlink_email_logs_opportunity;
DROP INDEX IF EXISTS public.idx_backlink_email_logs_status;
DROP INDEX IF EXISTS public.idx_viral_templates_category;
DROP INDEX IF EXISTS public.idx_viral_templates_performance;
DROP INDEX IF EXISTS public.idx_generation_logs_post;
DROP INDEX IF EXISTS public.idx_generation_logs_template;
DROP INDEX IF EXISTS public.idx_search_console_date;
DROP INDEX IF EXISTS public.idx_content_opportunities_priority;
DROP INDEX IF EXISTS public.idx_content_opportunities_trend;
DROP INDEX IF EXISTS public.idx_content_opportunities_used;
DROP INDEX IF EXISTS public.idx_ai_improvements_type;
DROP INDEX IF EXISTS public.idx_ai_improvements_date;
DROP INDEX IF EXISTS public.idx_faq_article_slug;
DROP INDEX IF EXISTS public.idx_backlink_outreach_opportunity;
DROP INDEX IF EXISTS public.idx_backlink_outreach_action;
DROP INDEX IF EXISTS public.idx_backlink_outreach_log_opportunity;
DROP INDEX IF EXISTS public.idx_backlink_outreach_log_status;

-- More unused indexes
DROP INDEX IF EXISTS public.idx_ai_ab_tests_url;
DROP INDEX IF EXISTS public.idx_ai_deployments_type;
DROP INDEX IF EXISTS public.idx_ai_deployments_status;
DROP INDEX IF EXISTS public.idx_ai_deployments_target;
DROP INDEX IF EXISTS public.idx_analytics_sessions_source;
DROP INDEX IF EXISTS public.idx_testimonials_status;
DROP INDEX IF EXISTS public.idx_testimonials_featured;
DROP INDEX IF EXISTS public.idx_analytics_sessions_city;
DROP INDEX IF EXISTS public.idx_analytics_sessions_converted;
DROP INDEX IF EXISTS public.idx_automation_status_enabled;
DROP INDEX IF EXISTS public.idx_cron_log_executed_at;
DROP INDEX IF EXISTS public.idx_analytics_events_session;
DROP INDEX IF EXISTS public.idx_quote_requests_status;
DROP INDEX IF EXISTS public.idx_quote_requests_city;
DROP INDEX IF EXISTS public.idx_quote_requests_created;
DROP INDEX IF EXISTS public.idx_content_queue_status;
DROP INDEX IF EXISTS public.idx_whatsapp_messages_group;
DROP INDEX IF EXISTS public.idx_automation_rules_active;
DROP INDEX IF EXISTS public.idx_pexels_used_id;
DROP INDEX IF EXISTS public.idx_pexels_used_query;
DROP INDEX IF EXISTS public.idx_schedule_status;
DROP INDEX IF EXISTS public.idx_schedule_scheduled_at;
DROP INDEX IF EXISTS public.idx_schedule_published_at;
DROP INDEX IF EXISTS public.idx_training_data_type;
DROP INDEX IF EXISTS public.idx_training_data_keywords;
DROP INDEX IF EXISTS public.idx_social_posts_platform;
DROP INDEX IF EXISTS public.idx_social_posts_should_respond;
DROP INDEX IF EXISTS public.idx_social_posts_scraped_at;
DROP INDEX IF EXISTS public.idx_responses_status;
DROP INDEX IF EXISTS public.idx_responses_target_type;
DROP INDEX IF EXISTS public.idx_comments_platform;
DROP INDEX IF EXISTS public.idx_comments_published_at;
DROP INDEX IF EXISTS public.idx_engagement_stats_date;
DROP INDEX IF EXISTS public.idx_email_threads_auto_responded;
DROP INDEX IF EXISTS public.idx_email_threads_requires_human;
DROP INDEX IF EXISTS public.idx_knowledge_category;
DROP INDEX IF EXISTS public.idx_knowledge_keywords;
DROP INDEX IF EXISTS public.idx_cron_logs_name;
DROP INDEX IF EXISTS public.idx_email_logs_email_type;
DROP INDEX IF EXISTS public.idx_cron_logs_executed;
DROP INDEX IF EXISTS public.idx_history_schedule;
DROP INDEX IF EXISTS public.idx_history_content;
DROP INDEX IF EXISTS public.idx_tracking_url;
DROP INDEX IF EXISTS public.idx_tracking_indexed;
DROP INDEX IF EXISTS public.idx_seo_indexation_url;
DROP INDEX IF EXISTS public.idx_ai_site_monitoring_type;
DROP INDEX IF EXISTS public.idx_city_pages_dept;
DROP INDEX IF EXISTS public.idx_city_pages_region;
DROP INDEX IF EXISTS public.idx_social_media_posts_scheduled;
DROP INDEX IF EXISTS public.city_pages_region_idx;

-- =====================================================
-- 3. DROP DUPLICATE INDEXES (excluding constraint indexes)
-- =====================================================

DROP INDEX IF EXISTS public.idx_blog_posts_featured_image;
DROP INDEX IF EXISTS public.idx_email_logs_type;
DROP INDEX IF EXISTS public.idx_faq_category;
DROP INDEX IF EXISTS public.idx_faq_order;
DROP INDEX IF EXISTS public.news_articles_slug_idx;
DROP INDEX IF EXISTS public.idx_backlink_outreach_log_opportunity_id;

-- =====================================================
-- 4. FIX PRIMARY KEY ON leads_backup
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'leads_backup' 
    AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.leads_backup ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
    ALTER TABLE public.leads_backup ADD PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================
-- 5. ENABLE RLS ON leads_backup
-- =====================================================

ALTER TABLE public.leads_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated users can read leads backup"
  ON public.leads_backup
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
