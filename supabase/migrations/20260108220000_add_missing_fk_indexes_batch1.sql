/*
  # Add Missing Foreign Key Indexes - Batch 1

  **Critical Performance Fix**
  
  This migration adds missing indexes on foreign key columns to improve query performance.
  Without these indexes, queries using JOINs or WHERE clauses on FK columns can be very slow.
  
  ## Tables Fixed (Batch 1):
  - ai_chat_sessions (lead_id)
  - assistance_pack_history (message_id, pack_id)
  - automation_workflows (created_by)
  - collaboration_comments (parent_comment_id, resolved_by)
  - collaboration_documents (locked_by)
  - collaboration_sessions (user_id)
  - crm_actions (event_id)
  - crm_ai_decisions (overridden_by)
  - crm_ai_governance_sessions (client_id, final_decision_id)
  - crm_ai_learning_features (lead_id)
  - crm_ai_recommendations (client_id)
  - crm_assistance_requests (contract_id)
  - crm_churn_signals (ai_decision_id)
  - crm_claims (assigned_to, police_report_id)
  - crm_clients (lead_id)
  - crm_gdpr_requests (assigned_to, client_id)
*/

-- ai_chat_sessions
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_lead_id 
ON ai_chat_sessions(lead_id);

-- assistance_pack_history
CREATE INDEX IF NOT EXISTS idx_assistance_pack_history_message_id 
ON assistance_pack_history(message_id);

CREATE INDEX IF NOT EXISTS idx_assistance_pack_history_pack_id 
ON assistance_pack_history(pack_id);

-- automation_workflows
CREATE INDEX IF NOT EXISTS idx_automation_workflows_created_by 
ON automation_workflows(created_by);

-- collaboration_comments
CREATE INDEX IF NOT EXISTS idx_collaboration_comments_parent_comment_id 
ON collaboration_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_collaboration_comments_resolved_by 
ON collaboration_comments(resolved_by);

-- collaboration_documents
CREATE INDEX IF NOT EXISTS idx_collaboration_documents_locked_by 
ON collaboration_documents(locked_by);

-- collaboration_sessions
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_user_id 
ON collaboration_sessions(user_id);

-- crm_actions
CREATE INDEX IF NOT EXISTS idx_crm_actions_event_id 
ON crm_actions(event_id);

-- crm_ai_decisions
CREATE INDEX IF NOT EXISTS idx_crm_ai_decisions_overridden_by 
ON crm_ai_decisions(overridden_by);

-- crm_ai_governance_sessions
CREATE INDEX IF NOT EXISTS idx_crm_ai_governance_sessions_client_id 
ON crm_ai_governance_sessions(client_id);

CREATE INDEX IF NOT EXISTS idx_crm_ai_governance_sessions_final_decision 
ON crm_ai_governance_sessions(final_decision_id);

-- crm_ai_learning_features
CREATE INDEX IF NOT EXISTS idx_crm_ai_learning_features_lead_id 
ON crm_ai_learning_features(lead_id);

-- crm_ai_recommendations
CREATE INDEX IF NOT EXISTS idx_crm_ai_recommendations_client_id 
ON crm_ai_recommendations(client_id);

-- crm_assistance_requests
CREATE INDEX IF NOT EXISTS idx_crm_assistance_requests_contract_id 
ON crm_assistance_requests(contract_id);

-- crm_churn_signals
CREATE INDEX IF NOT EXISTS idx_crm_churn_signals_ai_decision_id 
ON crm_churn_signals(ai_decision_id);

-- crm_claims
CREATE INDEX IF NOT EXISTS idx_crm_claims_assigned_to 
ON crm_claims(assigned_to);

CREATE INDEX IF NOT EXISTS idx_crm_claims_police_report_id 
ON crm_claims(police_report_id);

-- crm_clients
CREATE INDEX IF NOT EXISTS idx_crm_clients_lead_id 
ON crm_clients(lead_id);

-- crm_gdpr_requests
CREATE INDEX IF NOT EXISTS idx_crm_gdpr_requests_assigned_to 
ON crm_gdpr_requests(assigned_to);

CREATE INDEX IF NOT EXISTS idx_crm_gdpr_requests_client_id 
ON crm_gdpr_requests(client_id);
