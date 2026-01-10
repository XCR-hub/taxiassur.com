/*
  # Add Missing Foreign Key Indexes - Batch 1: CRM Core Tables

  1. Performance Improvements
    - Add indexes on foreign key columns in CRM core tables
    - Improves JOIN performance and referential integrity checks

  2. Indexes Added
    - crm_churn_signals.ai_decision_id
    - crm_quote_history.document_id
    - crm_settings.updated_by
    - crm_state_transitions.triggered_by_user_id
    - crm_vehicles.lead_id
    - crm_workflows.created_by
    - crm_workflow_runs.workflow_id
    - crm_workflow_runs.lead_id
*/

-- CRM Churn Signals
CREATE INDEX IF NOT EXISTS idx_crm_churn_signals_ai_decision_id
  ON crm_churn_signals(ai_decision_id);

-- CRM Quote History
CREATE INDEX IF NOT EXISTS idx_crm_quote_history_document_id
  ON crm_quote_history(document_id);

-- CRM Settings
CREATE INDEX IF NOT EXISTS idx_crm_settings_updated_by
  ON crm_settings(updated_by);

-- CRM State Transitions
CREATE INDEX IF NOT EXISTS idx_crm_state_transitions_triggered_by_user_id
  ON crm_state_transitions(triggered_by_user_id);

-- CRM Vehicles
CREATE INDEX IF NOT EXISTS idx_crm_vehicles_lead_id
  ON crm_vehicles(lead_id);

-- CRM Workflows
CREATE INDEX IF NOT EXISTS idx_crm_workflows_created_by
  ON crm_workflows(created_by);

-- CRM Workflow Runs
CREATE INDEX IF NOT EXISTS idx_crm_workflow_runs_workflow_id
  ON crm_workflow_runs(workflow_id);

CREATE INDEX IF NOT EXISTS idx_crm_workflow_runs_lead_id
  ON crm_workflow_runs(lead_id);
