/*
  # Suppression d'Indexes Inutilisés - Batch 2

  ## Indexes Supprimés (Batch 2/3)
  - crm_notifications: 1 index
  - crm_quotes_sent: 2 indexes
  - crm_tasks: 1 index
  - cross_sell_*: 2 indexes
  - document_categories: 1 index
  - feature_flag_overrides: 1 index
  - ia_*: 2 indexes
  - lead_*: 6 indexes
  - sinistres: 1 index
  - sms_logs: 2 indexes
  - social_posts: 1 index
*/

-- crm_notifications
DROP INDEX IF EXISTS idx_crm_notifications_lead_id_fk;

-- crm_quotes_sent (2 indexes)
DROP INDEX IF EXISTS idx_crm_quotes_sent_insurer_id_fk;
DROP INDEX IF EXISTS idx_crm_quotes_sent_sent_by_fk;

-- crm_tasks
DROP INDEX IF EXISTS idx_crm_tasks_assigned_by_fk;

-- cross_sell_history
DROP INDEX IF EXISTS idx_cross_sell_history_lead_id_fk;

-- cross_sell_opportunities
DROP INDEX IF EXISTS idx_cross_sell_opportunities_contract_id_fk;

-- document_categories
DROP INDEX IF EXISTS idx_document_categories_parent_category_id_fk;

-- feature_flag_overrides
DROP INDEX IF EXISTS idx_feature_flag_overrides_flag_key_fk;

-- ia_actions_log
DROP INDEX IF EXISTS idx_ia_actions_log_validated_by_fk;

-- ia_model_decisions
DROP INDEX IF EXISTS idx_ia_model_decisions_decision_id_fk;

-- lead_communications
DROP INDEX IF EXISTS idx_lead_communications_lead_id_fk;

-- lead_contracts
DROP INDEX IF EXISTS idx_lead_contracts_lead_id_fk;

-- lead_documents
DROP INDEX IF EXISTS idx_lead_documents_lead_id_fk;

-- lead_payments
DROP INDEX IF EXISTS idx_lead_payments_lead_id_fk;

-- lead_pipeline_history
DROP INDEX IF EXISTS idx_lead_pipeline_history_lead_id_fk;

-- lead_quotes
DROP INDEX IF EXISTS idx_lead_quotes_lead_id_fk;

-- lead_reminders
DROP INDEX IF EXISTS idx_lead_reminders_lead_id_fk;

-- sinistres
DROP INDEX IF EXISTS idx_sinistres_contract_id_fk;

-- sms_logs (2 indexes)
DROP INDEX IF EXISTS idx_sms_logs_campaign_id_fk;
DROP INDEX IF EXISTS idx_sms_logs_lead_id_fk;

-- social_posts
DROP INDEX IF EXISTS idx_social_posts_created_by_fk;

-- Rapport
DO $$
BEGIN
  RAISE NOTICE '✅ Batch 2: 20 indexes inutilisés supprimés';
END $$;
