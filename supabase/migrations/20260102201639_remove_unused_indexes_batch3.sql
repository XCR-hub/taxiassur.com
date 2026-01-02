/*
  # Remove Unused Indexes - Batch 3
  
  This migration removes indexes that are not being used by any queries.
  
  ## Indexes Removed (Part 3/3)
  
  - partner_analytics: idx_partner_analytics_partner_id
  - partner_interactions: idx_partner_interactions_partner_id
  - pinterest_performance_tracking: idx_pinterest_performance_tracking_post_id
  - post_generation_logs: idx_post_generation_logs_post_id, idx_post_generation_logs_template_id
  - quote_requests: idx_quote_requests_session_id
  - referrals: idx_referrals_ambassador_id
  - sinistre_actors: idx_sinistre_actors_insurer_id
  - sinistre_exchanges: idx_sinistre_exchanges_sinistre_id
  - sinistres: idx_sinistres_client_id
  - wa_messages: idx_wa_messages_sent_by_user_id
  - whatsapp_messages: idx_whatsapp_messages_group_id
  - admin_users: idx_admin_users_email_active
*/

DROP INDEX IF EXISTS public.idx_partner_analytics_partner_id;
DROP INDEX IF EXISTS public.idx_partner_interactions_partner_id;
DROP INDEX IF EXISTS public.idx_pinterest_performance_tracking_post_id;
DROP INDEX IF EXISTS public.idx_post_generation_logs_post_id;
DROP INDEX IF EXISTS public.idx_post_generation_logs_template_id;
DROP INDEX IF EXISTS public.idx_quote_requests_session_id;
DROP INDEX IF EXISTS public.idx_referrals_ambassador_id;
DROP INDEX IF EXISTS public.idx_sinistre_actors_insurer_id;
DROP INDEX IF EXISTS public.idx_sinistre_exchanges_sinistre_id;
DROP INDEX IF EXISTS public.idx_sinistres_client_id;
DROP INDEX IF EXISTS public.idx_wa_messages_sent_by_user_id;
DROP INDEX IF EXISTS public.idx_whatsapp_messages_group_id;
DROP INDEX IF EXISTS public.idx_admin_users_email_active;
