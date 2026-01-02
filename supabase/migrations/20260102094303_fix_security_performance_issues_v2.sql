/*
  # Fix Security and Performance Issues - Part 1

  ## Performance Improvements
  1. **Foreign Key Indexes**
     - Add indexes on all unindexed foreign keys
     - Dramatically improves JOIN performance
  
  2. **Remove Duplicate Indexes**
     - Drop duplicate indexes on city_pages and rate_limit_attempts
  
  3. **Enable RLS on Public Tables**
     - Enable RLS on `crm_email_analytics`
     - Enable RLS on `global_rate_limits`
*/

-- ============================================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_learning_feedback_response_id ON public.ai_learning_feedback(response_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_auto_corrections_health_check_id ON public.auto_corrections(health_check_id);
CREATE INDEX IF NOT EXISTS idx_backlink_email_logs_campaign_id ON public.backlink_email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_backlink_notifications_opportunity_id ON public.backlink_notifications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_campaign_id ON public.backlink_outreach(campaign_id);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_opportunity_id ON public.backlink_outreach(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_log_opportunity_id ON public.backlink_outreach_log(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_backlink_workflow_steps_opportunity_id ON public.backlink_workflow_steps(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_client_document_requests_portal_user_id ON public.client_document_requests(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_client_id ON public.client_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_activities_portal_user_id ON public.client_portal_activities(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_content_generation_history_schedule_id ON public.content_generation_history(schedule_id);
CREATE INDEX IF NOT EXISTS idx_conversion_funnel_session_id ON public.conversion_funnel(session_id);
CREATE INDEX IF NOT EXISTS idx_crm_ai_suggestions_lead_id ON public.crm_ai_suggestions(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_automation_rules_created_by ON public.crm_automation_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_automation_triggers_automation_rule_id ON public.crm_automation_triggers(automation_rule_id);
CREATE INDEX IF NOT EXISTS idx_crm_contracts_signed_insurer_id ON public.crm_contracts_signed(insurer_id);
CREATE INDEX IF NOT EXISTS idx_crm_documents_lead_id ON public.crm_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_analytics_interaction_id ON public.crm_email_analytics(interaction_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_analytics_lead_id ON public.crm_email_analytics(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_lead_id ON public.crm_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_notifications_user_id ON public.crm_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_sent_lead_id ON public.crm_quotes_sent(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON public.crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead_id ON public.crm_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_cross_sell_history_campaign_id ON public.cross_sell_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cross_sell_opportunities_client_id ON public.cross_sell_opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_category_id ON public.document_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_email_responses_inbox_id ON public.email_responses(inbox_id);
CREATE INDEX IF NOT EXISTS idx_lead_communications_parent_communication_id ON public.lead_communications(parent_communication_id);
CREATE INDEX IF NOT EXISTS idx_lead_contracts_payment_id ON public.lead_contracts(payment_id);
CREATE INDEX IF NOT EXISTS idx_lead_contracts_quote_id ON public.lead_contracts(quote_id);
CREATE INDEX IF NOT EXISTS idx_lead_payments_quote_id ON public.lead_payments(quote_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_history_stage_id ON public.lead_pipeline_history(stage_id);
CREATE INDEX IF NOT EXISTS idx_partner_analytics_partner_id ON public.partner_analytics(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_interactions_partner_id ON public.partner_interactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_pinterest_performance_tracking_post_id ON public.pinterest_performance_tracking(post_id);
CREATE INDEX IF NOT EXISTS idx_post_generation_logs_post_id ON public.post_generation_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_post_generation_logs_template_id ON public.post_generation_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_session_id ON public.quote_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_referrals_ambassador_id ON public.referrals(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_sinistre_actors_insurer_id ON public.sinistre_actors(insurer_id);
CREATE INDEX IF NOT EXISTS idx_sinistre_exchanges_sinistre_id ON public.sinistre_exchanges(sinistre_id);
CREATE INDEX IF NOT EXISTS idx_sinistres_client_id ON public.sinistres(client_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_sent_by_user_id ON public.wa_messages(sent_by_user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_group_id ON public.whatsapp_messages(group_id);

-- ============================================================================
-- PART 2: REMOVE DUPLICATE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS public.city_pages_slug_idx;
DROP INDEX IF EXISTS public.idx_rate_limit_attempts_identifier;

-- ============================================================================
-- PART 3: ENABLE RLS ON PUBLIC TABLES
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_email_analytics'
  ) THEN
    RAISE NOTICE 'Table crm_email_analytics does not exist, skipping RLS enable';
  ELSE
    ALTER TABLE public.crm_email_analytics ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Authenticated users can view email analytics" ON public.crm_email_analytics;
    CREATE POLICY "Authenticated users can view email analytics"
      ON public.crm_email_analytics FOR SELECT
      TO authenticated
      USING (true);

    DROP POLICY IF EXISTS "System can manage email analytics" ON public.crm_email_analytics;
    CREATE POLICY "System can manage email analytics"
      ON public.crm_email_analytics FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'global_rate_limits'
  ) THEN
    RAISE NOTICE 'Table global_rate_limits does not exist, skipping RLS enable';
  ELSE
    ALTER TABLE public.global_rate_limits ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Authenticated users can view rate limits" ON public.global_rate_limits;
    CREATE POLICY "Authenticated users can view rate limits"
      ON public.global_rate_limits FOR SELECT
      TO authenticated
      USING (true);

    DROP POLICY IF EXISTS "System can manage rate limits" ON public.global_rate_limits;
    CREATE POLICY "System can manage rate limits"
      ON public.global_rate_limits FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;