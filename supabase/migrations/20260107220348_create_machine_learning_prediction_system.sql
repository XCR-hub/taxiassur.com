/*
  # Système Machine Learning & Prédictions

  1. Tables
    - ml_models - Modèles ML entraînés
    - ml_predictions - Prédictions générées
    - ml_training_data - Données d'entraînement
    - ml_model_performance - Performance des modèles

  2. Use Cases
    - Prédiction meilleur moment d'envoi
    - Scoring prédictif de conversion
    - Churn prediction
    - Lifetime value estimation
    - Next best action
*/

CREATE TABLE IF NOT EXISTS ml_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  model_type text NOT NULL, -- conversion_scoring, churn_prediction, send_time_optimization, ltv_prediction
  algorithm text, -- random_forest, gradient_boosting, neural_network
  version text NOT NULL,
  features jsonb NOT NULL, -- Features utilisées
  hyperparameters jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  accuracy numeric(5,4),
  precision_score numeric(5,4),
  recall numeric(5,4),
  f1_score numeric(5,4),
  training_samples int,
  last_trained_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ml_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES ml_models(id),
  lead_id uuid REFERENCES leads(id),
  prediction_type text NOT NULL,
  predicted_value numeric(10,4) NOT NULL,
  confidence_score numeric(5,4) NOT NULL,
  features_used jsonb,
  explanation jsonb, -- SHAP values, feature importance
  is_validated boolean,
  actual_outcome text,
  prediction_accuracy numeric(5,4),
  created_at timestamptz DEFAULT now(),
  validated_at timestamptz
);

CREATE TABLE IF NOT EXISTS ml_training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type text NOT NULL,
  features jsonb NOT NULL,
  target_value numeric(10,4) NOT NULL,
  data_source text,
  is_validated boolean DEFAULT true,
  used_in_training boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ml_model_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES ml_models(id),
  evaluation_date timestamptz DEFAULT now(),
  accuracy numeric(5,4),
  precision_score numeric(5,4),
  recall numeric(5,4),
  f1_score numeric(5,4),
  auc_roc numeric(5,4),
  confusion_matrix jsonb,
  feature_importance jsonb,
  test_samples int,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ml_models_type ON ml_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ml_models_active ON ml_models(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model ON ml_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_lead ON ml_predictions(lead_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_created ON ml_predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_training_model_type ON ml_training_data(model_type);
CREATE INDEX IF NOT EXISTS idx_ml_performance_model ON ml_model_performance(model_id);

-- RLS
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage models" ON ml_models FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "Users view active models" ON ml_models FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Users view predictions for accessible leads" ON ml_predictions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = ml_predictions.lead_id));
CREATE POLICY "System create predictions" ON ml_predictions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "System manage training data" ON ml_training_data FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "Admins view performance" ON ml_model_performance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- Insérer modèles par défaut
INSERT INTO ml_models (name, description, model_type, algorithm, version, features, is_active) VALUES
(
  'Conversion Scorer v1',
  'Prédit la probabilité de conversion d''un lead',
  'conversion_scoring',
  'gradient_boosting',
  '1.0',
  '["email_opens","link_clicks","page_visits","time_on_site","form_completion","response_time","engagement_score"]'::jsonb,
  true
),
(
  'Send Time Optimizer v1',
  'Prédit le meilleur moment pour envoyer un email',
  'send_time_optimization',
  'neural_network',
  '1.0',
  '["past_open_times","timezone","day_of_week","hour_of_day","device_type","previous_engagement"]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;
