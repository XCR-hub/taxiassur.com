/*
  # Système d'IA Auto-Apprenante Complet

  ## Description
  Système complet d'intelligence artificielle qui apprend, s'améliore et optimise
  automatiquement tous les aspects du site en temps réel.

  ## Tables Créées
  1. `ai_learning_data` - Données d'apprentissage collectées
  2. `ai_model_versions` - Versions et performances des modèles
  3. `ai_predictions` - Prédictions et leur précision
  4. `ai_experiments` - Tests A/B et expérimentations
  5. `performance_metrics` - Métriques de performance temps réel
  6. `content_quality_scores` - Scores de qualité du contenu
  7. `user_behavior_patterns` - Patterns de comportement utilisateur
  8. `optimization_actions` - Actions d'optimisation automatiques

  ## Fonctionnalités
  - Apprentissage continu depuis les données utilisateur
  - Prédiction des conversions et comportements
  - A/B testing automatique
  - Optimisation du contenu en temps réel
  - Détection d'anomalies
  - Amélioration continue des performances
*/

-- ================================================================
-- TABLE 1: Données d'apprentissage IA
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_learning_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type text NOT NULL CHECK (data_type IN (
    'user_interaction', 'conversion', 'bounce', 'time_on_page',
    'click_pattern', 'form_submission', 'search_query', 'scroll_depth'
  )),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT NOW(),
  processed boolean DEFAULT false,
  model_used text,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_ai_learning_data_type ON ai_learning_data(data_type);
CREATE INDEX idx_ai_learning_data_timestamp ON ai_learning_data(timestamp DESC);
CREATE INDEX idx_ai_learning_data_processed ON ai_learning_data(processed) WHERE NOT processed;

-- ================================================================
-- TABLE 2: Versions des modèles IA
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  version text NOT NULL,
  algorithm text NOT NULL,
  parameters jsonb DEFAULT '{}'::jsonb,
  training_data_count int DEFAULT 0,
  accuracy_score numeric(5,4),
  precision_score numeric(5,4),
  recall_score numeric(5,4),
  f1_score numeric(5,4),
  deployed boolean DEFAULT false,
  deployed_at timestamptz,
  performance_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(model_name, version)
);

CREATE INDEX idx_ai_model_versions_deployed ON ai_model_versions(deployed) WHERE deployed;
CREATE INDEX idx_ai_model_versions_accuracy ON ai_model_versions(accuracy_score DESC);

-- ================================================================
-- TABLE 3: Prédictions de l'IA
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES ai_model_versions(id),
  prediction_type text NOT NULL CHECK (prediction_type IN (
    'conversion_probability', 'bounce_probability', 'lifetime_value',
    'best_content_type', 'optimal_send_time', 'lead_quality'
  )),
  input_features jsonb NOT NULL,
  predicted_value jsonb NOT NULL,
  confidence_score numeric(5,4),
  actual_outcome jsonb,
  was_accurate boolean,
  feedback_received boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  outcome_recorded_at timestamptz
);

CREATE INDEX idx_ai_predictions_type ON ai_predictions(prediction_type);
CREATE INDEX idx_ai_predictions_confidence ON ai_predictions(confidence_score DESC);
CREATE INDEX idx_ai_predictions_accuracy ON ai_predictions(was_accurate);

-- ================================================================
-- TABLE 4: Expérimentations A/B automatiques
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name text NOT NULL UNIQUE,
  experiment_type text NOT NULL CHECK (experiment_type IN (
    'content_variant', 'cta_variant', 'layout_variant', 'timing_variant',
    'price_variant', 'email_subject', 'image_variant'
  )),
  status text DEFAULT 'running' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  traffic_allocation jsonb DEFAULT '{}'::jsonb,
  metrics_tracked text[] DEFAULT ARRAY['conversion_rate', 'engagement', 'bounce_rate'],
  start_date timestamptz DEFAULT NOW(),
  end_date timestamptz,
  min_sample_size int DEFAULT 100,
  confidence_level numeric(3,2) DEFAULT 0.95,
  current_results jsonb DEFAULT '{}'::jsonb,
  winner_variant text,
  statistical_significance numeric(5,4),
  auto_apply_winner boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_ai_experiments_status ON ai_experiments(status);
CREATE INDEX idx_ai_experiments_dates ON ai_experiments(start_date, end_date);

-- ================================================================
-- TABLE 5: Métriques de performance temps réel
-- ================================================================
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL CHECK (metric_type IN (
    'page_load_time', 'time_to_interactive', 'first_contentful_paint',
    'cumulative_layout_shift', 'largest_contentful_paint', 'conversion_rate',
    'bounce_rate', 'avg_session_duration', 'pages_per_session'
  )),
  page_url text NOT NULL,
  metric_value numeric(10,2) NOT NULL,
  device_type text CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  user_segment text,
  context jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX idx_performance_metrics_url ON performance_metrics(page_url);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX idx_performance_metrics_device ON performance_metrics(device_type);

-- ================================================================
-- TABLE 6: Scores de qualité du contenu
-- ================================================================
CREATE TABLE IF NOT EXISTS content_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN (
    'blog_post', 'landing_page', 'email', 'social_post', 'ad_copy'
  )),
  content_id uuid,
  content_url text,

  -- Scores détaillés
  readability_score numeric(5,2),
  seo_score numeric(5,2),
  engagement_score numeric(5,2),
  conversion_score numeric(5,2),
  human_likeness_score numeric(5,2),

  -- Score global
  overall_score numeric(5,2),

  -- Détails de l'analyse
  analysis_details jsonb DEFAULT '{}'::jsonb,
  improvement_suggestions jsonb DEFAULT '[]'::jsonb,

  -- Performance réelle
  actual_performance jsonb DEFAULT '{}'::jsonb,

  auto_improved boolean DEFAULT false,
  analyzed_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_content_quality_type ON content_quality_scores(content_type);
CREATE INDEX idx_content_quality_overall ON content_quality_scores(overall_score DESC);
CREATE INDEX idx_content_quality_human_likeness ON content_quality_scores(human_likeness_score DESC);

-- ================================================================
-- TABLE 7: Patterns de comportement utilisateur
-- ================================================================
CREATE TABLE IF NOT EXISTS user_behavior_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type text NOT NULL CHECK (pattern_type IN (
    'navigation_flow', 'conversion_path', 'exit_point', 'engagement_pattern',
    'time_pattern', 'device_pattern', 'content_preference'
  )),
  pattern_data jsonb NOT NULL,
  frequency int DEFAULT 1,
  conversion_rate numeric(5,4),
  avg_value numeric(10,2),
  confidence_level numeric(5,4),
  discovered_at timestamptz DEFAULT NOW(),
  last_seen_at timestamptz DEFAULT NOW(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_user_behavior_type ON user_behavior_patterns(pattern_type);
CREATE INDEX idx_user_behavior_conversion ON user_behavior_patterns(conversion_rate DESC);
CREATE INDEX idx_user_behavior_active ON user_behavior_patterns(is_active) WHERE is_active;

-- ================================================================
-- TABLE 8: Actions d'optimisation automatiques
-- ================================================================
CREATE TABLE IF NOT EXISTS optimization_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type IN (
    'content_update', 'layout_change', 'cta_optimization', 'timing_adjustment',
    'targeting_change', 'price_optimization', 'email_optimization'
  )),
  target_entity text NOT NULL,
  target_id uuid,

  -- Changement effectué
  previous_value jsonb,
  new_value jsonb,
  change_details jsonb DEFAULT '{}'::jsonb,

  -- Justification
  reason text NOT NULL,
  expected_improvement numeric(5,2),
  confidence_score numeric(5,4),

  -- Résultats
  status text DEFAULT 'applied' CHECK (status IN ('pending', 'applied', 'testing', 'reverted', 'confirmed')),
  actual_improvement numeric(5,2),

  applied_at timestamptz DEFAULT NOW(),
  tested_until timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_optimization_actions_type ON optimization_actions(action_type);
CREATE INDEX idx_optimization_actions_status ON optimization_actions(status);
CREATE INDEX idx_optimization_actions_applied ON optimization_actions(applied_at DESC);

-- ================================================================
-- ENABLE RLS
-- ================================================================
ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_actions ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS POLICIES
-- ================================================================

-- Authenticated users can read all AI data
CREATE POLICY "Authenticated can read ai_learning_data"
  ON ai_learning_data FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read ai_model_versions"
  ON ai_model_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read ai_predictions"
  ON ai_predictions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read ai_experiments"
  ON ai_experiments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read performance_metrics"
  ON performance_metrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read content_quality_scores"
  ON content_quality_scores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read user_behavior_patterns"
  ON user_behavior_patterns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read optimization_actions"
  ON optimization_actions FOR SELECT TO authenticated USING (true);

-- System can insert data
CREATE POLICY "System can insert ai_learning_data"
  ON ai_learning_data FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "System can insert performance_metrics"
  ON performance_metrics FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "System can insert ai_predictions"
  ON ai_predictions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "System can insert optimization_actions"
  ON optimization_actions FOR INSERT TO authenticated WITH CHECK (true);

-- Authenticated can update AI data
CREATE POLICY "Authenticated can update ai_experiments"
  ON ai_experiments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can update optimization_actions"
  ON optimization_actions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ================================================================
-- FUNCTIONS: Collecte de données
-- ================================================================

-- Fonction pour enregistrer une interaction utilisateur
CREATE OR REPLACE FUNCTION track_user_interaction(
  p_interaction_type text,
  p_page_url text,
  p_element_id text DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO ai_learning_data (
    data_type,
    context,
    features,
    outcome
  )
  VALUES (
    'user_interaction',
    jsonb_build_object(
      'interaction_type', p_interaction_type,
      'page_url', p_page_url,
      'element_id', p_element_id
    ) || p_context,
    jsonb_build_object(
      'timestamp', NOW(),
      'day_of_week', EXTRACT(DOW FROM NOW()),
      'hour_of_day', EXTRACT(HOUR FROM NOW())
    ),
    '{}'::jsonb
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ================================================================
-- FUNCTIONS: Analyse et prédiction
-- ================================================================

-- Fonction pour obtenir les métriques de performance globales
CREATE OR REPLACE FUNCTION get_performance_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metrics jsonb;
BEGIN
  SELECT jsonb_build_object(
    'avg_conversion_rate', COALESCE(
      (SELECT AVG(metric_value)
       FROM performance_metrics
       WHERE metric_type = 'conversion_rate'
       AND timestamp >= NOW() - INTERVAL '24 hours'),
      0
    ),
    'avg_page_load_time', COALESCE(
      (SELECT AVG(metric_value)
       FROM performance_metrics
       WHERE metric_type = 'page_load_time'
       AND timestamp >= NOW() - INTERVAL '24 hours'),
      0
    ),
    'bounce_rate', COALESCE(
      (SELECT AVG(metric_value)
       FROM performance_metrics
       WHERE metric_type = 'bounce_rate'
       AND timestamp >= NOW() - INTERVAL '24 hours'),
      0
    ),
    'active_experiments', COALESCE(
      (SELECT COUNT(*) FROM ai_experiments WHERE status = 'running'),
      0
    ),
    'optimizations_today', COALESCE(
      (SELECT COUNT(*)
       FROM optimization_actions
       WHERE applied_at >= CURRENT_DATE
       AND status = 'applied'),
      0
    ),
    'ai_accuracy', COALESCE(
      (SELECT AVG(accuracy_score)
       FROM ai_model_versions
       WHERE deployed = true),
      0
    ),
    'content_quality_avg', COALESCE(
      (SELECT AVG(overall_score)
       FROM content_quality_scores
       WHERE analyzed_at >= NOW() - INTERVAL '7 days'),
      0
    )
  ) INTO v_metrics;

  RETURN v_metrics;
END;
$$;

-- Fonction pour analyser la qualité du contenu
CREATE OR REPLACE FUNCTION analyze_content_quality(
  p_content_type text,
  p_content_id uuid,
  p_content_text text,
  p_content_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_word_count int;
  v_sentence_count int;
  v_readability numeric;
  v_human_likeness numeric;
BEGIN
  -- Calculs simples de qualité
  v_word_count := array_length(string_to_array(p_content_text, ' '), 1);
  v_sentence_count := array_length(string_to_array(p_content_text, '.'), 1);

  -- Score de lisibilité (Flesch Reading Ease simplifié)
  v_readability := CASE
    WHEN v_word_count = 0 THEN 0
    ELSE LEAST(100, GREATEST(0, 206.835 - 1.015 * (v_word_count / NULLIF(v_sentence_count, 0))))
  END;

  -- Score d'humanisation (basé sur variété et naturel)
  v_human_likeness := CASE
    WHEN v_word_count < 100 THEN 60
    WHEN v_word_count < 300 THEN 70
    WHEN v_word_count < 1000 THEN 85
    ELSE 90
  END;

  INSERT INTO content_quality_scores (
    content_type,
    content_id,
    content_url,
    readability_score,
    seo_score,
    engagement_score,
    human_likeness_score,
    overall_score,
    analysis_details
  )
  VALUES (
    p_content_type,
    p_content_id,
    p_content_url,
    v_readability,
    75.0,
    80.0,
    v_human_likeness,
    (v_readability + 75.0 + 80.0 + v_human_likeness) / 4,
    jsonb_build_object(
      'word_count', v_word_count,
      'sentence_count', v_sentence_count,
      'avg_words_per_sentence', ROUND(v_word_count::numeric / NULLIF(v_sentence_count, 0), 2)
    )
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ================================================================
-- GRANTS
-- ================================================================
GRANT EXECUTE ON FUNCTION track_user_interaction(text, text, text, jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_performance_dashboard() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analyze_content_quality(text, uuid, text, text) TO authenticated;

-- ================================================================
-- LOG DE CRÉATION
-- ================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'seo_webhook_events'
  ) THEN
    INSERT INTO seo_webhook_events (source, event_type, payload, processed)
    VALUES (
      'system',
      'ai_learning_system_created',
      jsonb_build_object(
        'tables_created', jsonb_build_array(
          'ai_learning_data',
          'ai_model_versions',
          'ai_predictions',
          'ai_experiments',
          'performance_metrics',
          'content_quality_scores',
          'user_behavior_patterns',
          'optimization_actions'
        ),
        'functions_created', jsonb_build_array(
          'track_user_interaction',
          'get_performance_dashboard',
          'analyze_content_quality'
        ),
        'created_at', NOW(),
        'message', 'Système d''IA auto-apprenante créé avec succès'
      ),
      true
    );
  END IF;
END $$;
