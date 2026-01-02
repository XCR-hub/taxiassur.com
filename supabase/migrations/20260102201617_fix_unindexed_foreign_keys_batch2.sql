/*
  # Fix Unindexed Foreign Keys - Batch 2
  
  This migration adds missing indexes on foreign key columns to improve query performance.
  
  ## Tables Fixed (Part 2/3)
  
  - crm_tasks: assigned_by
  - cross_sell_history: lead_id
  - cross_sell_opportunities: contract_id
  - document_categories: parent_category_id
  - feature_flag_overrides: flag_key
  - ia_actions_log: validated_by
  - ia_model_decisions: decision_id
  - lead_communications: lead_id
  - lead_contracts: lead_id
  - lead_documents: lead_id
  - lead_payments: lead_id
  - lead_pipeline_history: lead_id
  - lead_quotes: lead_id
  - lead_reminders: lead_id
*/

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
