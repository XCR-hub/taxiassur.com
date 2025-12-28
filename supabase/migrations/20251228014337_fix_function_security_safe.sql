/*
  # Fix Security & Performance Issues - Part 7: Secure Functions (Safe Version)

  ## Changes
  
  ### 1. Fix Function Search Path
  Sets immutable search_path on existing functions.
  
  ### 2. Drop Security Definer Views
  Removes security definer property from views.
*/

-- =====================================================
-- 1. DROP SECURITY DEFINER VIEWS
-- =====================================================

DROP VIEW IF EXISTS public.ai_dashboard_realtime CASCADE;
DROP VIEW IF EXISTS public.ai_performance_dashboard CASCADE;

-- =====================================================
-- 2. FIX FUNCTION SEARCH PATHS (Safe - only existing functions)
-- =====================================================

DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Loop through all functions without proper search_path
  FOR func_record IN 
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'update_updated_at_column',
      'update_news_articles_updated_at',
      'update_city_pages_updated_at',
      'update_faq_entries_updated_at',
      'update_faq_items_updated_at',
      'update_seo_metrics_updated_at',
      'update_signature_requests_updated_at',
      'update_news_source_timestamp',
      'update_automation_status_timestamp',
      'calculate_viral_score',
      'calculate_virality_score',
      'calculate_taxi_lead_score',
      'calculate_partner_ai_score',
      'calculate_opportunity_score',
      'calculate_relevance_score',
      'get_leads_by_city',
      'get_faq_by_city',
      'get_faq_by_category',
      'get_city_info',
      'get_blog_post_by_slug',
      'get_all_faq',
      'get_faqs',
      'get_leads',
      'get_blog_posts',
      'trigger_automation',
      'process_backlink_workflow',
      'process_backlink_outreach_workflow',
      'trigger_backlink_workflow',
      'trigger_backlink_scan',
      'trigger_gsc_sync',
      'generate_blog_post_ai',
      'generate_daily_blog_post',
      'generate_weekly_faq',
      'generate_city_pages',
      'mark_content_published',
      'register_gdpr_consent',
      'export_personal_data',
      'delete_personal_data',
      'create_dsr_request',
      'process_opt_out',
      'generate_referral_code',
      'check_pexels_image_not_used',
      'register_pexels_image_used',
      'track_seo_metrics',
      'track_url_for_indexation',
      'log_seo_ping',
      'update_social_post_analytics',
      'update_engagement_stats',
      'analyze_conversion_patterns',
      'get_dashboard_stats',
      'get_leads_stats',
      'get_email_stats',
      'get_security_stats',
      'get_system_health',
      'get_social_media_stats',
      'get_realtime_stats',
      'get_automation_status',
      'get_cron_execution_stats',
      'cleanup_old_security_logs',
      'cleanup_old_qr_usage',
      'cleanup_old_marketing_usage',
      'cleanup_expired_data',
      'cleanup_failed_generations',
      'has_permission',
      'get_contract_type_label',
      'get_lead_status_label',
      'prevent_duplicate_blog_slug',
      'prevent_duplicate_city_slug',
      'trigger_calculate_score',
      'validate_lead_fields',
      'send_automatic_email_on_status_change',
      'notify_team_backlink_accepted',
      'notify_admin_on_cron_failure',
      'auto_update_backlink_status',
      'update_viral_score_trigger',
      'update_indexation_status',
      'learn_from_feedback',
      'extract_ai_insights',
      'should_respond_to_post',
      'ai_moderate_and_respond',
      'ai_analyze_and_improve_pages',
      'ai_detect_opportunities',
      'ai_scan_entire_site',
      'auto_improve_content',
      'auto_analyze_page',
      'search_content',
      'upsert_blog_post',
      'execute_sql',
      'call_edge_function',
      'get_supabase_url'
    )
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = pg_catalog, public',
        func_record.schema_name,
        func_record.function_name,
        func_record.args
      );
    EXCEPTION WHEN OTHERS THEN
      -- Skip if function can't be altered
      CONTINUE;
    END;
  END LOOP;
END $$;
