/*
  # Remove Unused Indexes - Batch 2

  ## Performance Optimization
  Continues removing unused indexes for SMS, AI, and monitoring systems.
*/

-- Batch 5: Cross-sell and Documents
DROP INDEX IF EXISTS public.idx_cross_sell_opportunities_contract_id;
DROP INDEX IF EXISTS public.idx_document_categories_parent_category_id;

-- Batch 6: AI and IA indexes
DROP INDEX IF EXISTS public.idx_ia_actions_log_validated_by;
DROP INDEX IF EXISTS public.idx_ia_model_decisions_decision_id;
DROP INDEX IF EXISTS public.idx_ai_comments_published_response_id;

-- Batch 7: Sinistres and Social
DROP INDEX IF EXISTS public.idx_sinistres_contract_id;
DROP INDEX IF EXISTS public.idx_social_posts_created_by;

-- Batch 8: SMS indexes
DROP INDEX IF EXISTS public.idx_sms_logs_campaign;
DROP INDEX IF EXISTS public.idx_sms_logs_lead;
DROP INDEX IF EXISTS public.idx_sms_logs_status;
DROP INDEX IF EXISTS public.idx_sms_campaigns_status;
DROP INDEX IF EXISTS public.idx_sms_logs_message_sid;
DROP INDEX IF EXISTS public.idx_sms_logs_created_at;
DROP INDEX IF EXISTS public.idx_sms_received_from_number;
DROP INDEX IF EXISTS public.idx_sms_received_processed;
DROP INDEX IF EXISTS public.idx_sms_received_received_at;

-- Batch 9: System Health indexes
DROP INDEX IF EXISTS public.idx_health_checks_status;
DROP INDEX IF EXISTS public.idx_health_checks_component;
DROP INDEX IF EXISTS public.idx_anomalies_severity;

-- Batch 10: AI Performance indexes
DROP INDEX IF EXISTS public.idx_prompt_versions_active;
DROP INDEX IF EXISTS public.idx_ab_tests_status;
DROP INDEX IF EXISTS public.idx_model_performance;
DROP INDEX IF EXISTS public.idx_realtime_metrics_category;
DROP INDEX IF EXISTS public.idx_smart_alerts_severity;
DROP INDEX IF EXISTS public.idx_patterns_confidence;
DROP INDEX IF EXISTS public.idx_rule_performance;
DROP INDEX IF EXISTS public.idx_automation_roi;
DROP INDEX IF EXISTS public.idx_conversion_predictions;