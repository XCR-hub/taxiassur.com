/*
  # Add Missing Foreign Key Indexes - Batch 3: Workflows & Automation

  1. Performance Improvements
    - Add indexes on workflow and automation foreign keys
    - Improves workflow execution queries

  2. Indexes Added
    - workflow_executions.current_step_id
    - workflow_step_executions.step_id
    - workflow_steps.parent_step_id
    - follow_up_history (multiple columns)
*/

-- Workflow Executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_current_step_id
  ON workflow_executions(current_step_id);

-- Workflow Step Executions
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_step_id
  ON workflow_step_executions(step_id);

-- Workflow Steps
CREATE INDEX IF NOT EXISTS idx_workflow_steps_parent_step_id
  ON workflow_steps(parent_step_id);

-- Follow Up History
CREATE INDEX IF NOT EXISTS idx_follow_up_history_follow_up_message_id
  ON follow_up_history(follow_up_message_id);

CREATE INDEX IF NOT EXISTS idx_follow_up_history_original_message_id
  ON follow_up_history(original_message_id);

CREATE INDEX IF NOT EXISTS idx_follow_up_history_rule_id
  ON follow_up_history(rule_id);
