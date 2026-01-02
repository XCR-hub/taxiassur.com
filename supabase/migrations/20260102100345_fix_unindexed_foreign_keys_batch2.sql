/*
  # Fix Unindexed Foreign Keys - Batch 2

  ## Tables Fixed (Batch 2 - Remaining 32 foreign keys)
  1. crm_quotes_sent - insurer_id, sent_by
  2. crm_tasks - assigned_by
  3. cross_sell_history - lead_id
  4. cross_sell_opportunities - contract_id
  5. document_categories - parent_category_id
  6. feature_flag_overrides - flag_key
  7. ia_actions_log - validated_by
  8. ia_model_decisions - decision_id
  9. lead_communications - lead_id
  10. lead_contracts - lead_id
  11. lead_documents - lead_id
  12. lead_payments - lead_id
  13. lead_pipeline_history - lead_id
  14. lead_quotes - lead_id
  15. lead_reminders - lead_id
  16. sinistres - contract_id
  17. sms_logs - campaign_id, lead_id
  18. social_posts - created_by
  19. wa_contacts - lead_id
  20. wa_conversations - assigned_to_user_id, contact_id
  21. wa_messages - conversation_id
*/

-- crm_quotes_sent
CREATE INDEX IF NOT EXISTS idx_crm_quotes_sent_insurer_id_fk 
  ON public.crm_quotes_sent(insurer_id);

CREATE INDEX IF NOT EXISTS idx_crm_quotes_sent_sent_by_fk 
  ON public.crm_quotes_sent(sent_by);

-- crm_tasks
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_by_fk 
  ON public.crm_tasks(assigned_by);

-- cross_sell_history
CREATE INDEX IF NOT EXISTS idx_cross_sell_history_lead_id_fk 
  ON public.cross_sell_history(lead_id);

-- cross_sell_opportunities
CREATE INDEX IF NOT EXISTS idx_cross_sell_opportunities_contract_id_fk 
  ON public.cross_sell_opportunities(contract_id);

-- document_categories
CREATE INDEX IF NOT EXISTS idx_document_categories_parent_category_id_fk 
  ON public.document_categories(parent_category_id);

-- feature_flag_overrides
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_flag_key_fk 
  ON public.feature_flag_overrides(flag_key);

-- ia_actions_log
CREATE INDEX IF NOT EXISTS idx_ia_actions_log_validated_by_fk 
  ON public.ia_actions_log(validated_by);

-- ia_model_decisions
CREATE INDEX IF NOT EXISTS idx_ia_model_decisions_decision_id_fk 
  ON public.ia_model_decisions(decision_id);

-- lead_communications
CREATE INDEX IF NOT EXISTS idx_lead_communications_lead_id_fk 
  ON public.lead_communications(lead_id);

-- lead_contracts
CREATE INDEX IF NOT EXISTS idx_lead_contracts_lead_id_fk 
  ON public.lead_contracts(lead_id);

-- lead_documents
CREATE INDEX IF NOT EXISTS idx_lead_documents_lead_id_fk 
  ON public.lead_documents(lead_id);

-- lead_payments
CREATE INDEX IF NOT EXISTS idx_lead_payments_lead_id_fk 
  ON public.lead_payments(lead_id);

-- lead_pipeline_history
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_history_lead_id_fk 
  ON public.lead_pipeline_history(lead_id);

-- lead_quotes
CREATE INDEX IF NOT EXISTS idx_lead_quotes_lead_id_fk 
  ON public.lead_quotes(lead_id);

-- lead_reminders
CREATE INDEX IF NOT EXISTS idx_lead_reminders_lead_id_fk 
  ON public.lead_reminders(lead_id);

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