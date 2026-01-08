/*
  # CRM TaxiAssur - Module IA (Multi-Agents + Gouvernance)

  ## Tables

  1. crm_ai_agents - Configuration des agents IA
  2. crm_ai_decisions - Décisions prises par l'IA
  3. crm_ai_recommendations - Recommandations individuelles par agent
  4. crm_ai_governance_sessions - Sessions d'arbitrage IA Council
  5. crm_ai_learning_features - Features pour apprentissage
  6. crm_ai_strategy_performance - Performances des stratégies

  ## Sécurité

  - RLS activé sur décisions
  - Traçabilité complète
*/

-- ============================================================================
-- TABLES IA
-- ============================================================================

-- Table des agents IA
CREATE TABLE IF NOT EXISTS crm_ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Définition
  agent_type ai_agent_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Configuration
  model_name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,

  -- Statut
  enabled BOOLEAN DEFAULT true,
  version TEXT DEFAULT '1.0.0',

  -- Performance
  total_decisions INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 0,
  average_confidence DECIMAL(5, 2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed des agents
INSERT INTO crm_ai_agents (agent_type, name, description, model_name, prompt_template) VALUES
  ('SALES_AGENT', 'Agent Commercial', 'Optimise vente et relances', 'gpt-4', 'Tu es un expert en vente assurance taxi. Analyse le contexte lead et propose la meilleure action commerciale.'),
  ('RETENTION_AGENT', 'Agent Rétention', 'Prévient churn et fidélise', 'gpt-4', 'Tu es un expert en fidélisation client. Détecte signaux faibles et propose actions préventives.'),
  ('PRODUCTION_AGENT', 'Agent Production', 'Gère docs/signature/paiement', 'gpt-4', 'Tu es un expert en production contrats. Optimise collecte documents et conversion.'),
  ('COMPLIANCE_AGENT', 'Agent Conformité', 'Vérifie RGPD et obligations', 'gpt-4', 'Tu es un expert en conformité assurance. Vérifie respect règles RGPD et obligations légales.'),
  ('VOICE_AGENT', 'Agent Vocal', 'Scripts appels IA', 'gpt-4', 'Tu es un expert en communication téléphonique. Génère scripts appels adaptés au contexte.'),
  ('ANALYST_AGENT', 'Agent Analyste', 'Optimise KPI et stratégies', 'gpt-4', 'Tu es un expert en analyse de données CRM. Identifie patterns et optimise stratégies.')
ON CONFLICT (agent_type) DO NOTHING;

-- Table des décisions IA
CREATE TABLE IF NOT EXISTS crm_ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexte
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
  event_id UUID,

  -- Gouvernance (council)
  governance_session_id UUID,

  -- Décision finale
  decision_type TEXT NOT NULL,
  rationale TEXT NOT NULL,
  confidence DECIMAL(5, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),

  -- Actions planifiées
  actions JSONB NOT NULL,

  -- Exécution
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'EXECUTED', 'REJECTED', 'FAILED')),
  executed_at TIMESTAMPTZ,
  execution_result JSONB,

  -- Override humain
  overridden BOOLEAN DEFAULT false,
  overridden_by UUID REFERENCES admin_users(id),
  override_reason TEXT,

  -- Feedback
  outcome TEXT CHECK (outcome IN ('SUCCESS', 'FAILURE', 'PARTIAL', 'UNKNOWN')),
  outcome_data JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_lead ON crm_ai_decisions(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_client ON crm_ai_decisions(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_status ON crm_ai_decisions(status);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_session ON crm_ai_decisions(governance_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_created ON crm_ai_decisions(created_at DESC);

-- Table des recommandations d'agents
CREATE TABLE IF NOT EXISTS crm_ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent source
  agent_id UUID NOT NULL REFERENCES crm_ai_agents(id) ON DELETE CASCADE,
  agent_type ai_agent_type NOT NULL,

  -- Session de gouvernance
  governance_session_id UUID NOT NULL,

  -- Contexte
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,

  -- Recommandation
  recommendation JSONB NOT NULL,
  rationale TEXT NOT NULL,
  confidence DECIMAL(5, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  priority INTEGER DEFAULT 0,

  -- Vote gouvernance
  vote_weight DECIMAL(5, 2) DEFAULT 1.0,
  selected BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_session ON crm_ai_recommendations(governance_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_agent ON crm_ai_recommendations(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_lead ON crm_ai_recommendations(lead_id);

-- Table des sessions de gouvernance IA
CREATE TABLE IF NOT EXISTS crm_ai_governance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexte
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
  trigger_event event_type,

  -- Processus
  agents_consulted ai_agent_type[],
  total_recommendations INTEGER DEFAULT 0,

  -- Arbitrage
  arbitration_method TEXT DEFAULT 'VOTE_WEIGHTED' CHECK (arbitration_method IN ('VOTE_WEIGHTED', 'CONFIDENCE_MAX', 'CONSENSUS', 'MANUAL')),
  winner_agent_type ai_agent_type,
  final_decision_id UUID,

  -- Compliance check
  compliance_passed BOOLEAN DEFAULT true,
  compliance_notes TEXT,

  -- Durée
  duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_governance_sessions_lead ON crm_ai_governance_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_governance_sessions_created ON crm_ai_governance_sessions(created_at DESC);

-- Table d'apprentissage IA (features)
CREATE TABLE IF NOT EXISTS crm_ai_learning_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexte
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES crm_ai_decisions(id) ON DELETE CASCADE,

  -- Features extraites
  features JSONB NOT NULL,

  -- Labels
  outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE', 'PARTIAL')),
  outcome_score DECIMAL(5, 2),

  -- Metadata
  context_snapshot JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_features_decision ON crm_ai_learning_features(decision_id);
CREATE INDEX IF NOT EXISTS idx_learning_features_outcome ON crm_ai_learning_features(outcome);

-- Table des performances de stratégies
CREATE TABLE IF NOT EXISTS crm_ai_strategy_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stratégie
  strategy_name TEXT NOT NULL,
  strategy_params JSONB NOT NULL,

  -- Contexte
  lead_status lead_status,
  communication_channel communication_channel,

  -- Métriques
  total_executions INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 0,
  average_response_time_hours DECIMAL(8, 2),
  conversion_rate DECIMAL(5, 2),

  -- Timestamps
  first_used_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_performance_name ON crm_ai_strategy_performance(strategy_name);
CREATE INDEX IF NOT EXISTS idx_strategy_performance_rate ON crm_ai_strategy_performance(success_rate DESC);

-- RLS
ALTER TABLE crm_ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ai_governance_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins managers acces decisions IA"
  ON crm_ai_decisions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('ADMIN', 'MANAGER')
    )
  );

CREATE POLICY "Utilisateurs voient decisions leurs leads"
  ON crm_ai_decisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_ai_decisions.lead_id
      AND crm_leads.assigned_to = auth.uid()
    )
  );

-- Triggers
CREATE TRIGGER update_crm_ai_agents_updated_at BEFORE UPDATE ON crm_ai_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_ai_strategy_performance_updated_at BEFORE UPDATE ON crm_ai_strategy_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour ajouter foreign key après création decision
ALTER TABLE crm_ai_governance_sessions
  ADD CONSTRAINT fk_governance_final_decision
  FOREIGN KEY (final_decision_id)
  REFERENCES crm_ai_decisions(id)
  ON DELETE SET NULL;

COMMENT ON TABLE crm_ai_agents IS 'Configuration et performance des agents IA spécialisés';
COMMENT ON TABLE crm_ai_decisions IS 'Décisions IA avec traçabilité complète et feedback';
COMMENT ON TABLE crm_ai_governance_sessions IS 'Sessions d''arbitrage multi-agents (IA Council)';
COMMENT ON TABLE crm_ai_learning_features IS 'Features extraites pour apprentissage continu';
COMMENT ON TABLE crm_ai_strategy_performance IS 'Performance tracking des stratégies IA';
