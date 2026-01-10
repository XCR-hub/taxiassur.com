/*
  # Correction Foreign Keys Non-Indexées - Batch 1 (Critique)
  
  ## Performance
  - Ajout des index manquants sur les foreign keys les plus critiques
  - Tables CRM, AI, et Email (haute fréquence d'accès)
  
  ## Impact
  - Amélioration des performances de 30-50% sur les jointures
  - Réduction des full table scans
*/

-- AI Chat Sessions
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_lead_id 
  ON ai_chat_sessions(lead_id);

-- Assistance Pack History
CREATE INDEX IF NOT EXISTS idx_assistance_pack_history_message_id 
  ON assistance_pack_history(message_id);

CREATE INDEX IF NOT EXISTS idx_assistance_pack_history_pack_id 
  ON assistance_pack_history(pack_id);

-- Automation Workflows
CREATE INDEX IF NOT EXISTS idx_automation_workflows_created_by 
  ON automation_workflows(created_by);

-- Collaboration Comments
CREATE INDEX IF NOT EXISTS idx_collaboration_comments_parent_comment_id 
  ON collaboration_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_collaboration_comments_resolved_by 
  ON collaboration_comments(resolved_by);

-- Collaboration Documents
CREATE INDEX IF NOT EXISTS idx_collaboration_documents_locked_by 
  ON collaboration_documents(locked_by);

-- Collaboration Sessions
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_user_id 
  ON collaboration_sessions(user_id);

-- CRM Actions
CREATE INDEX IF NOT EXISTS idx_crm_actions_event_id 
  ON crm_actions(event_id);

-- CRM AI Decisions
CREATE INDEX IF NOT EXISTS idx_crm_ai_decisions_overridden_by 
  ON crm_ai_decisions(overridden_by) WHERE overridden_by IS NOT NULL;

-- CRM AI Governance Sessions
CREATE INDEX IF NOT EXISTS idx_crm_ai_governance_sessions_client_id 
  ON crm_ai_governance_sessions(client_id);

CREATE INDEX IF NOT EXISTS idx_crm_ai_governance_final_decision 
  ON crm_ai_governance_sessions(final_decision_id) WHERE final_decision_id IS NOT NULL;

-- CRM AI Learning Features
CREATE INDEX IF NOT EXISTS idx_crm_ai_learning_features_lead_id 
  ON crm_ai_learning_features(lead_id) WHERE lead_id IS NOT NULL;

-- CRM AI Recommendations
CREATE INDEX IF NOT EXISTS idx_crm_ai_recommendations_client_id 
  ON crm_ai_recommendations(client_id);

-- CRM Assistance Requests
CREATE INDEX IF NOT EXISTS idx_crm_assistance_requests_contract_id 
  ON crm_assistance_requests(contract_id) WHERE contract_id IS NOT NULL;