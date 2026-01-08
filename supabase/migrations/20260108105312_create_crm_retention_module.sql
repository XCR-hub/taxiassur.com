/*
  # CRM TaxiAssur - Module Rétention (Scores, Churn, Cross-sell)

  ## Tables

  1. crm_retention_scores - Scores de rétention calculés
  2. crm_churn_signals - Signaux faibles de churn détectés
  3. crm_cross_sell_opportunities - Opportunités de vente additionnelle
*/

-- Table scores rétention
CREATE TABLE IF NOT EXISTS crm_retention_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  churn_probability DECIMAL(5, 2) CHECK (churn_probability >= 0 AND churn_probability <= 100),
  factors JSONB NOT NULL,
  segment TEXT CHECK (segment IN ('HIGH_VALUE_SAFE', 'HIGH_VALUE_RISK', 'MEDIUM_VALUE', 'LOW_VALUE', 'CRITICAL_RISK')),
  recommended_actions JSONB,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retention_client ON crm_retention_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_retention_score ON crm_retention_scores(score);
CREATE INDEX IF NOT EXISTS idx_retention_segment ON crm_retention_scores(segment);
CREATE INDEX IF NOT EXISTS idx_retention_calc ON crm_retention_scores(calculated_at DESC);

-- Table signaux churn
CREATE TABLE IF NOT EXISTS crm_churn_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'PAYMENT_FAILURE',
    'NO_RESPONSE_MULTIPLE',
    'COMPLAINT_FILED',
    'CLAIM_DISSATISFACTION',
    'COMPETITOR_INQUIRY',
    'RENEWAL_APPROACHING_NO_CONTACT',
    'USAGE_DECREASED',
    'SUPPORT_TICKETS_INCREASED',
    'LOW_SATISFACTION_SCORE',
    'PRICE_OBJECTION'
  )),
  severity TEXT DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  actions_triggered BOOLEAN DEFAULT false,
  ai_decision_id UUID REFERENCES crm_ai_decisions(id),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_churn_client ON crm_churn_signals(client_id);
CREATE INDEX IF NOT EXISTS idx_churn_type ON crm_churn_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_churn_severity ON crm_churn_signals(severity);
CREATE INDEX IF NOT EXISTS idx_churn_unresolved ON crm_churn_signals(resolved) WHERE resolved = false;

-- Table opportunités cross-sell
CREATE TABLE IF NOT EXISTS crm_cross_sell_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL CHECK (product_type IN (
    'PROTECTION_JURIDIQUE',
    'SANTE_PREVOYANCE',
    'RETRAITE',
    'MRP',
    'FLEET_EXTENSION',
    'ASSISTANCE_PREMIUM'
  )),
  propensity_score DECIMAL(5, 2) CHECK (propensity_score >= 0 AND propensity_score <= 100),
  expected_value DECIMAL(10, 2),
  trigger_event TEXT,
  rationale TEXT NOT NULL,
  opp_status TEXT DEFAULT 'IDENTIFIED' CHECK (opp_status IN ('IDENTIFIED', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'REJECTED', 'EXPIRED')),
  contacted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  identified_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cross_client ON crm_cross_sell_opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_cross_status ON crm_cross_sell_opportunities(opp_status);
CREATE INDEX IF NOT EXISTS idx_cross_score ON crm_cross_sell_opportunities(propensity_score DESC);

-- RLS
ALTER TABLE crm_retention_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_churn_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_cross_sell_opportunities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins managers retention"
  ON crm_retention_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('ADMIN', 'MANAGER', 'SALES')
    )
  );

CREATE POLICY "Admins managers churn"
  ON crm_churn_signals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('ADMIN', 'MANAGER', 'SALES')
    )
  );

CREATE POLICY "Admins managers cross"
  ON crm_cross_sell_opportunities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('ADMIN', 'MANAGER', 'SALES')
    )
  );

-- Triggers
CREATE TRIGGER update_crm_cross_sell_updated_at BEFORE UPDATE ON crm_cross_sell_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE crm_retention_scores IS 'Scores de rétention calculés par IA avec segmentation';
COMMENT ON TABLE crm_churn_signals IS 'Signaux faibles de churn détectés automatiquement';
COMMENT ON TABLE crm_cross_sell_opportunities IS 'Opportunités de vente additionnelle avec scoring';
