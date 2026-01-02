/*
  # Ajout d'Indexes Manquants sur Foreign Keys - Batch 2

  ## Tables Affectées (Batch 2/3)
  1. crm_automation_rules
  2. crm_automation_triggers
  3. crm_contracts_signed
  4. crm_documents
  5. crm_email_analytics (2 FK)
  6. crm_interactions
  7. crm_notifications
  8. crm_quotes_sent
  9. crm_tasks
  10. cross_sell_history
  11. cross_sell_opportunities
  12. document_templates
  13. email_responses
  14. lead_communications
  15. lead_contracts (2 FK)
*/

-- crm_automation_rules
CREATE INDEX IF NOT EXISTS idx_crm_automation_rules_created_by 
  ON crm_automation_rules(created_by);

-- crm_automation_triggers
CREATE INDEX IF NOT EXISTS idx_crm_automation_triggers_automation_rule_id 
  ON crm_automation_triggers(automation_rule_id);

-- crm_contracts_signed
CREATE INDEX IF NOT EXISTS idx_crm_contracts_signed_insurer_id 
  ON crm_contracts_signed(insurer_id);

-- crm_documents
CREATE INDEX IF NOT EXISTS idx_crm_documents_lead_id 
  ON crm_documents(lead_id);

-- crm_email_analytics (2 FK)
CREATE INDEX IF NOT EXISTS idx_crm_email_analytics_interaction_id 
  ON crm_email_analytics(interaction_id);

CREATE INDEX IF NOT EXISTS idx_crm_email_analytics_lead_id 
  ON crm_email_analytics(lead_id);

-- crm_interactions
CREATE INDEX IF NOT EXISTS idx_crm_interactions_lead_id 
  ON crm_interactions(lead_id);

-- crm_notifications
CREATE INDEX IF NOT EXISTS idx_crm_notifications_user_id 
  ON crm_notifications(user_id);

-- crm_quotes_sent
CREATE INDEX IF NOT EXISTS idx_crm_quotes_sent_lead_id 
  ON crm_quotes_sent(lead_id);

-- crm_tasks
CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead_id 
  ON crm_tasks(lead_id);

-- cross_sell_history
CREATE INDEX IF NOT EXISTS idx_cross_sell_history_campaign_id 
  ON cross_sell_history(campaign_id);

-- cross_sell_opportunities
CREATE INDEX IF NOT EXISTS idx_cross_sell_opportunities_client_id 
  ON cross_sell_opportunities(client_id);

-- document_templates
CREATE INDEX IF NOT EXISTS idx_document_templates_category_id 
  ON document_templates(category_id);

-- email_responses
CREATE INDEX IF NOT EXISTS idx_email_responses_inbox_id 
  ON email_responses(inbox_id);

-- lead_communications
CREATE INDEX IF NOT EXISTS idx_lead_communications_parent_communication_id 
  ON lead_communications(parent_communication_id);

-- lead_contracts (2 FK)
CREATE INDEX IF NOT EXISTS idx_lead_contracts_payment_id 
  ON lead_contracts(payment_id);

CREATE INDEX IF NOT EXISTS idx_lead_contracts_quote_id 
  ON lead_contracts(quote_id);

-- Commentaires
COMMENT ON INDEX idx_crm_documents_lead_id IS 
  'Optimise les JOIN sur crm_documents.lead_id';

COMMENT ON INDEX idx_crm_interactions_lead_id IS 
  'Optimise les JOIN sur crm_interactions.lead_id';

COMMENT ON INDEX idx_crm_tasks_lead_id IS 
  'Optimise les JOIN sur crm_tasks.lead_id';
