/*
  # Add Missing Foreign Key Indexes - Remaining Tables (Batch 7)

  1. Changes
    - Adds indexes for all remaining foreign keys
    - 26 indexes added

  2. Tables Covered
    - document_categories (1 FK)
    - document_templates (1 FK)
    - email_responses (1 FK)
    - feature_flag_overrides (1 FK)
    - ia_actions_log (1 FK)
    - ia_model_decisions (1 FK)
    - newsletter_campaigns (1 FK)
    - partner_analytics (1 FK)
    - partner_interactions (1 FK)
    - pinterest_performance_tracking (1 FK)
    - post_generation_logs (2 FKs)
    - quote_requests (1 FK)
    - referrals (1 FK)
    - sinistre_actors (1 FK)
    - sinistre_exchanges (1 FK)
    - sinistres (2 FKs)
    - sms_logs (2 FKs)
    - social_posts (1 FK)
    - system_config (1 FK)
    - wa_contacts (1 FK)
    - wa_conversations (2 FKs)
    - wa_messages (2 FKs)
    - whatsapp_messages (1 FK)

  3. Performance Impact
    - Complete foreign key coverage
    - Optimal JOIN performance
*/

-- document_categories
CREATE INDEX IF NOT EXISTS idx_document_categories_parent_category_id_fk 
ON public.document_categories(parent_category_id);

-- document_templates
CREATE INDEX IF NOT EXISTS idx_document_templates_category_id_fk 
ON public.document_templates(category_id);

-- email_responses
CREATE INDEX IF NOT EXISTS idx_email_responses_inbox_id_fk 
ON public.email_responses(inbox_id);

-- feature_flag_overrides
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_flag_key_fk 
ON public.feature_flag_overrides(flag_key);

-- ia_actions_log
CREATE INDEX IF NOT EXISTS idx_ia_actions_log_validated_by_fk 
ON public.ia_actions_log(validated_by);

-- ia_model_decisions
CREATE INDEX IF NOT EXISTS idx_ia_model_decisions_decision_id_fk 
ON public.ia_model_decisions(decision_id);

-- newsletter_campaigns
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_created_by_fk 
ON public.newsletter_campaigns(created_by);

-- partner_analytics
CREATE INDEX IF NOT EXISTS idx_partner_analytics_partner_id_fk 
ON public.partner_analytics(partner_id);

-- partner_interactions
CREATE INDEX IF NOT EXISTS idx_partner_interactions_partner_id_fk 
ON public.partner_interactions(partner_id);

-- pinterest_performance_tracking
CREATE INDEX IF NOT EXISTS idx_pinterest_performance_tracking_post_id_fk 
ON public.pinterest_performance_tracking(post_id);

-- post_generation_logs
CREATE INDEX IF NOT EXISTS idx_post_generation_logs_post_id_fk 
ON public.post_generation_logs(post_id);

CREATE INDEX IF NOT EXISTS idx_post_generation_logs_template_id_fk 
ON public.post_generation_logs(template_id);

-- quote_requests
CREATE INDEX IF NOT EXISTS idx_quote_requests_session_id_fk 
ON public.quote_requests(session_id);

-- referrals
CREATE INDEX IF NOT EXISTS idx_referrals_ambassador_id_fk 
ON public.referrals(ambassador_id);

-- sinistre_actors
CREATE INDEX IF NOT EXISTS idx_sinistre_actors_insurer_id_fk 
ON public.sinistre_actors(insurer_id);

-- sinistre_exchanges
CREATE INDEX IF NOT EXISTS idx_sinistre_exchanges_sinistre_id_fk 
ON public.sinistre_exchanges(sinistre_id);

-- sinistres
CREATE INDEX IF NOT EXISTS idx_sinistres_client_id_fk 
ON public.sinistres(client_id);

CREATE INDEX IF NOT EXISTS idx_sinistres_contract_id_fk 
ON public.sinistres(contract_id);

-- sms_logs
CREATE INDEX IF NOT EXISTS idx_sms_logs_campaign_id_fk 
ON public.sms_logs(campaign_id);

CREATE INDEX IF NOT EXISTS idx_sms_logs_lead_id_fk 
ON public.sms_logs(lead_id);

-- social_posts
CREATE INDEX IF NOT EXISTS idx_social_posts_created_by_fk 
ON public.social_posts(created_by);

-- system_config
CREATE INDEX IF NOT EXISTS idx_system_config_updated_by_fk 
ON public.system_config(updated_by);

-- wa_contacts
CREATE INDEX IF NOT EXISTS idx_wa_contacts_lead_id_fk 
ON public.wa_contacts(lead_id);

-- wa_conversations
CREATE INDEX IF NOT EXISTS idx_wa_conversations_assigned_to_user_id_fk 
ON public.wa_conversations(assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_wa_conversations_contact_id_fk 
ON public.wa_conversations(contact_id);

-- wa_messages
CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation_id_fk 
ON public.wa_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_wa_messages_sent_by_user_id_fk 
ON public.wa_messages(sent_by_user_id);

-- whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_group_id_fk 
ON public.whatsapp_messages(group_id);
