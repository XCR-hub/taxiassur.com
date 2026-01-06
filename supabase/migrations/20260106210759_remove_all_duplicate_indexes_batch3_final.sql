/*
  # Remove All Duplicate Indexes - Batch 3 (Final)

  1. Changes
    - Completes removal of all duplicate foreign key indexes
    - Tables: lead_payments through whatsapp_messages

  2. Tables Affected (Batch 3 - 15 tables with some having 2 duplicates)
*/

DROP INDEX IF EXISTS public.idx_lead_payments_quote_id_fk;
DROP INDEX IF EXISTS public.idx_lead_pipeline_history_stage_id_fk;
DROP INDEX IF EXISTS public.idx_newsletter_campaigns_created_by_fk;
DROP INDEX IF EXISTS public.idx_partner_analytics_partner_id_fk;
DROP INDEX IF EXISTS public.idx_partner_interactions_partner_id_fk;
DROP INDEX IF EXISTS public.idx_pinterest_performance_tracking_post_id_fk;
DROP INDEX IF EXISTS public.idx_post_generation_logs_post_id_fk;
DROP INDEX IF EXISTS public.idx_post_generation_logs_template_id_fk;
DROP INDEX IF EXISTS public.idx_quote_requests_session_id_fk;
DROP INDEX IF EXISTS public.idx_referrals_ambassador_id_fk;
DROP INDEX IF EXISTS public.idx_sinistre_actors_insurer_id_fk;
DROP INDEX IF EXISTS public.idx_sinistre_exchanges_sinistre_id_fk;
DROP INDEX IF EXISTS public.idx_sinistres_client_id_fk;
DROP INDEX IF EXISTS public.idx_system_config_updated_by_fk;
DROP INDEX IF EXISTS public.idx_wa_messages_sent_by_user_id_fk;
DROP INDEX IF EXISTS public.idx_whatsapp_messages_group_id_fk;
