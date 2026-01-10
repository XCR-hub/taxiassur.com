/*
  # Add Missing Foreign Key Indexes - Batch 4: Production & Retention

  1. Performance Improvements
    - Add indexes on production and retention foreign keys
    - Improves production tasks and retention queries

  2. Indexes Added
    - production_tasks.lead_id
    - retention_actions.churn_signal_id
    - retention_actions.retention_score_id
    - internal_routing_history.routing_rule_id
*/

-- Production Tasks
CREATE INDEX IF NOT EXISTS idx_production_tasks_lead_id
  ON production_tasks(lead_id);

-- Retention Actions
CREATE INDEX IF NOT EXISTS idx_retention_actions_churn_signal_id
  ON retention_actions(churn_signal_id);

CREATE INDEX IF NOT EXISTS idx_retention_actions_retention_score_id
  ON retention_actions(retention_score_id);

-- Internal Routing History
CREATE INDEX IF NOT EXISTS idx_internal_routing_history_routing_rule_id
  ON internal_routing_history(routing_rule_id);
