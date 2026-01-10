/*
  # Add RLS Policies for CRM AI Tables

  1. Security
    - Add RLS policies for crm_ai_agents
    - Add RLS policies for crm_ai_governance_sessions
    - Add RLS policies for crm_ai_learning_features
    - Add RLS policies for crm_ai_recommendations
    - Add RLS policies for crm_ai_strategy_performance

  2. Policy Strategy
    - Restrict to authenticated users only (backoffice admins)
    - Use (select auth.uid()) pattern for performance
*/

-- CRM AI Agents
CREATE POLICY "Authenticated users can view AI agents"
  ON crm_ai_agents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage AI agents"
  ON crm_ai_agents FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- CRM AI Governance Sessions
CREATE POLICY "Authenticated users can view governance sessions"
  ON crm_ai_governance_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage governance sessions"
  ON crm_ai_governance_sessions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- CRM AI Learning Features
CREATE POLICY "Authenticated users can view learning features"
  ON crm_ai_learning_features FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage learning features"
  ON crm_ai_learning_features FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- CRM AI Recommendations
CREATE POLICY "Authenticated users can view recommendations"
  ON crm_ai_recommendations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage recommendations"
  ON crm_ai_recommendations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- CRM AI Strategy Performance
CREATE POLICY "Authenticated users can view strategy performance"
  ON crm_ai_strategy_performance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage strategy performance"
  ON crm_ai_strategy_performance FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
