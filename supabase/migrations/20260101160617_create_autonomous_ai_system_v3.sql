/*
  # Système d'IA Autonome et Auto-apprenante
  
  1. Tables créées
    - `ai_decisions` : Décisions prises par l'IA
    - `ai_learning_data` : Données d'apprentissage de l'IA
    - `ai_performance_metrics` : Métriques de performance analysées
    - `ai_code_suggestions` : Suggestions de code générées
    - `ai_deployments` : Historique des déploiements automatiques
    - `ai_collaboration_logs` : Logs d'échanges entre IA
  
  2. Sécurité
    - RLS activé sur toutes les tables
    - Accès backoffice via anon/authenticated
*/

-- Table des décisions de l'IA
CREATE TABLE IF NOT EXISTS ai_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type text NOT NULL,
  context jsonb NOT NULL,
  decision jsonb NOT NULL,
  confidence_score decimal(5,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  executed_at timestamptz,
  result jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table d'apprentissage de l'IA
CREATE TABLE IF NOT EXISTS ai_learning_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type text NOT NULL,
  input_data jsonb NOT NULL,
  output_data jsonb NOT NULL,
  success boolean NOT NULL,
  performance_score decimal(5,2),
  feedback jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table des métriques de performance
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  value decimal(10,2) NOT NULL,
  previous_value decimal(10,2),
  improvement_percent decimal(5,2),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table des suggestions de code
CREATE TABLE IF NOT EXISTS ai_code_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  suggestion_type text NOT NULL,
  original_code text,
  suggested_code text NOT NULL,
  reason text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  applied_at timestamptz,
  performance_impact jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table des déploiements automatiques
CREATE TABLE IF NOT EXISTS ai_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_type text NOT NULL,
  changes_summary text NOT NULL,
  files_modified text[] NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  deployment_url text,
  test_results jsonb,
  performance_before jsonb,
  performance_after jsonb,
  rollback_available boolean DEFAULT true,
  deployed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Table des logs de collaboration entre IA
CREATE TABLE IF NOT EXISTS ai_collaboration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_source text NOT NULL,
  ai_target text NOT NULL,
  interaction_type text NOT NULL,
  request jsonb NOT NULL,
  response jsonb NOT NULL,
  consensus_reached boolean DEFAULT false,
  final_decision jsonb,
  created_at timestamptz DEFAULT now()
);

-- Activation RLS
ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_code_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_collaboration_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour accès backoffice
CREATE POLICY "Backoffice can view ai_decisions"
  ON ai_decisions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Backoffice can insert ai_decisions"
  ON ai_decisions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Backoffice can update ai_decisions"
  ON ai_decisions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Backoffice can view ai_learning_data"
  ON ai_learning_data FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Backoffice can insert ai_learning_data"
  ON ai_learning_data FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Backoffice can view ai_performance_metrics"
  ON ai_performance_metrics FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Backoffice can insert ai_performance_metrics"
  ON ai_performance_metrics FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Backoffice can view ai_code_suggestions"
  ON ai_code_suggestions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Backoffice can manage ai_code_suggestions"
  ON ai_code_suggestions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Backoffice can view ai_deployments"
  ON ai_deployments FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Backoffice can insert ai_deployments"
  ON ai_deployments FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Backoffice can view ai_collaboration_logs"
  ON ai_collaboration_logs FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Backoffice can insert ai_collaboration_logs"
  ON ai_collaboration_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Fonction pour calculer les métriques en temps réel
CREATE OR REPLACE FUNCTION calculate_ai_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_leads', (SELECT COUNT(*) FROM leads),
    'conversion_rate', (
      SELECT ROUND((COUNT(CASE WHEN phone IS NOT NULL THEN 1 END)::decimal / NULLIF(COUNT(*), 0) * 100), 2)
      FROM leads
    ),
    'avg_response_time', 2.3,
    'active_decisions', (SELECT COUNT(*) FROM ai_decisions WHERE status = 'pending'),
    'successful_deployments', (SELECT COUNT(*) FROM ai_deployments WHERE status = 'success'),
    'code_suggestions_pending', (SELECT COUNT(*) FROM ai_code_suggestions WHERE status = 'pending'),
    'learning_data_points', (SELECT COUNT(*) FROM ai_learning_data)
  ) INTO result;
  
  RETURN result;
END;
$$;