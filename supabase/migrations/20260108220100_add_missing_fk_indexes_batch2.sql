/*
  # Add Missing Foreign Key Indexes - Batch 2

  Continues adding missing FK indexes for performance.
  
  ## Tables Fixed (Batch 2):
  - crm_state_transitions (triggered_by_user_id)
  - crm_vehicles (lead_id)
  - crm_workflows (created_by)
  - dynamic_content_blocks (personalization_rule_id)
  - email_replies (email_send_id)
  - follow_up_history (follow_up_message_id, original_message_id, rule_id)
  - integration_actions (user_id)
  - internal_routing_history (routing_rule_id)
  - pdf_access_logs (accessed_by)
  - pdf_exports (template_id)
  - pdf_templates (created_by)
  - production_tasks (lead_id, resolved_by)
  - retention_actions (churn_signal_id, retention_score_id)
  - rfm_history (segment_id)
  - segment_assignments (segment_id)
  - translations (verified_by)
*/

-- crm_state_transitions
CREATE INDEX IF NOT EXISTS idx_crm_state_transitions_triggered_by 
ON crm_state_transitions(triggered_by_user_id);

-- crm_vehicles
CREATE INDEX IF NOT EXISTS idx_crm_vehicles_lead_id 
ON crm_vehicles(lead_id);

-- crm_workflows
CREATE INDEX IF NOT EXISTS idx_crm_workflows_created_by 
ON crm_workflows(created_by);

-- dynamic_content_blocks
CREATE INDEX IF NOT EXISTS idx_dynamic_content_blocks_personalization_rule_id 
ON dynamic_content_blocks(personalization_rule_id);

-- email_replies
CREATE INDEX IF NOT EXISTS idx_email_replies_email_send_id 
ON email_replies(email_send_id);

-- follow_up_history
CREATE INDEX IF NOT EXISTS idx_follow_up_history_follow_up_message_id 
ON follow_up_history(follow_up_message_id);

CREATE INDEX IF NOT EXISTS idx_follow_up_history_original_message_id 
ON follow_up_history(original_message_id);

CREATE INDEX IF NOT EXISTS idx_follow_up_history_rule_id 
ON follow_up_history(rule_id);

-- integration_actions
CREATE INDEX IF NOT EXISTS idx_integration_actions_user_id 
ON integration_actions(user_id);

-- internal_routing_history
CREATE INDEX IF NOT EXISTS idx_internal_routing_history_routing_rule_id 
ON internal_routing_history(routing_rule_id);

-- pdf_access_logs
CREATE INDEX IF NOT EXISTS idx_pdf_access_logs_accessed_by 
ON pdf_access_logs(accessed_by);

-- pdf_exports
CREATE INDEX IF NOT EXISTS idx_pdf_exports_template_id 
ON pdf_exports(template_id);

-- pdf_templates
CREATE INDEX IF NOT EXISTS idx_pdf_templates_created_by 
ON pdf_templates(created_by);

-- production_tasks
CREATE INDEX IF NOT EXISTS idx_production_tasks_lead_id 
ON production_tasks(lead_id);

CREATE INDEX IF NOT EXISTS idx_production_tasks_resolved_by 
ON production_tasks(resolved_by);

-- retention_actions
CREATE INDEX IF NOT EXISTS idx_retention_actions_churn_signal_id 
ON retention_actions(churn_signal_id);

CREATE INDEX IF NOT EXISTS idx_retention_actions_retention_score_id 
ON retention_actions(retention_score_id);

-- rfm_history
CREATE INDEX IF NOT EXISTS idx_rfm_history_segment_id 
ON rfm_history(segment_id);

-- segment_assignments
CREATE INDEX IF NOT EXISTS idx_segment_assignments_segment_id 
ON segment_assignments(segment_id);

-- translations
CREATE INDEX IF NOT EXISTS idx_translations_verified_by 
ON translations(verified_by);
