/*
  # Fix Unindexed Foreign Keys - Batch 3
  
  This migration adds missing indexes on foreign key columns to improve query performance.
  
  ## Tables Fixed (Part 3/3)
  
  - sinistres: contract_id
  - sms_logs: campaign_id, lead_id
  - social_posts: created_by
  - wa_contacts: lead_id
  - wa_conversations: assigned_to_user_id, contact_id
  - wa_messages: conversation_id
*/

-- sinistres
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
