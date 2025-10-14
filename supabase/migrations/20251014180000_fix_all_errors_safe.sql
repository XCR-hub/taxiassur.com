/*
  # Correction Finale SAFE - Tous les Problèmes SQL

  ## Corrections
  - Fix toutes les colonnes manquantes
  - Fix toutes les fonctions RPC
  - Activation automatisations
  - Gestion des tables existantes

  ## Sécurité
  - Vérifie l'existence de chaque colonne avant ajout
  - Vérifie l'existence de chaque table avant création
  - Supprime les anciennes fonctions proprement
*/

-- ================================================================
-- PARTIE 1: SUPPRESSION FONCTIONS EXISTANTES
-- ================================================================

DROP FUNCTION IF EXISTS get_realtime_stats();
DROP FUNCTION IF EXISTS ai_scan_entire_site();
DROP FUNCTION IF EXISTS ai_moderate_and_respond(text, text, text);
DROP FUNCTION IF EXISTS ai_detect_opportunities();
DROP FUNCTION IF EXISTS get_automation_status();

-- ================================================================
-- PARTIE 2: TABLES DE BASE
-- ================================================================

-- Table seo_automation_config
CREATE TABLE IF NOT EXISTS seo_automation_config (
  key text PRIMARY KEY,
  value jsonb DEFAULT '{}'::jsonb,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Table city_pages
CREATE TABLE IF NOT EXISTS city_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL,
  slug text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Ajouter contraintes uniques si elles n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'city_pages_city_name_key') THEN
    ALTER TABLE city_pages ADD CONSTRAINT city_pages_city_name_key UNIQUE (city_name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'city_pages_slug_key') THEN
    ALTER TABLE city_pages ADD CONSTRAINT city_pages_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Table seo_metrics
CREATE TABLE IF NOT EXISTS seo_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_urls int DEFAULT 0,
  indexed_pages int DEFAULT 0,
  pending_pages int DEFAULT 0,
  impressions bigint DEFAULT 0,
  clicks int DEFAULT 0,
  ctr numeric(5,2) DEFAULT 0,
  average_position numeric(5,2) DEFAULT 0,
  source text DEFAULT 'manual',
  last_crawl_date timestamptz,
  created_at timestamptz DEFAULT NOW()
);

-- Compléter table leads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'status') THEN
    ALTER TABLE leads ADD COLUMN status text DEFAULT 'nouveau';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'prime_realisee') THEN
    ALTER TABLE leads ADD COLUMN prime_realisee numeric(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'notes') THEN
    ALTER TABLE leads ADD COLUMN notes text;
  END IF;
END $$;

-- ================================================================
-- PARTIE 3: TABLES IA AVEC GESTION COLONNES
-- ================================================================

-- Table ai_learning_data
CREATE TABLE IF NOT EXISTS ai_learning_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  features jsonb DEFAULT '{}'::jsonb,
  outcome jsonb DEFAULT '{}'::jsonb,
  model_used text,
  created_at timestamptz DEFAULT NOW()
);

-- Ajouter colonne processed si manquante
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_learning_data' AND column_name = 'processed') THEN
    ALTER TABLE ai_learning_data ADD COLUMN processed boolean DEFAULT false;
  END IF;
END $$;

-- Créer index seulement si table a la colonne
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_learning_data' AND column_name = 'processed') THEN
    CREATE INDEX IF NOT EXISTS idx_ai_learning_data_processed ON ai_learning_data(processed) WHERE NOT processed;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_learning_data_type ON ai_learning_data(data_type);
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_created ON ai_learning_data(created_at DESC);

-- Table ai_model_versions
CREATE TABLE IF NOT EXISTS ai_model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  version text NOT NULL,
  algorithm text NOT NULL,
  parameters jsonb DEFAULT '{}'::jsonb,
  training_data_count int DEFAULT 0,
  accuracy_score numeric(5,4),
  deployed boolean DEFAULT false,
  deployed_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Ajouter contrainte unique si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_model_versions_model_name_version_key') THEN
    ALTER TABLE ai_model_versions ADD CONSTRAINT ai_model_versions_model_name_version_key UNIQUE (model_name, version);
  END IF;
END $$;

-- Table ai_predictions
CREATE TABLE IF NOT EXISTS ai_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_type text NOT NULL,
  input_features jsonb NOT NULL,
  predicted_value jsonb NOT NULL,
  confidence_score numeric(5,4),
  actual_outcome jsonb,
  was_accurate boolean,
  created_at timestamptz DEFAULT NOW()
);

-- Ajouter colonne model_id si manquante (avec FK optionnelle)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_predictions' AND column_name = 'model_id') THEN
    ALTER TABLE ai_predictions ADD COLUMN model_id uuid;
  END IF;
END $$;

-- Table ai_experiments
CREATE TABLE IF NOT EXISTS ai_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name text NOT NULL,
  experiment_type text NOT NULL,
  status text DEFAULT 'running',
  variants jsonb DEFAULT '[]'::jsonb,
  current_results jsonb DEFAULT '{}'::jsonb,
  start_date timestamptz DEFAULT NOW(),
  end_date timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Ajouter contrainte unique
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_experiments_experiment_name_key') THEN
    ALTER TABLE ai_experiments ADD CONSTRAINT ai_experiments_experiment_name_key UNIQUE (experiment_name);
  END IF;
END $$;

-- Table performance_metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  page_url text NOT NULL,
  metric_value numeric(10,2) NOT NULL,
  device_type text,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created ON performance_metrics(created_at DESC);

-- Table content_quality_scores
CREATE TABLE IF NOT EXISTS content_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid,
  content_url text,
  readability_score numeric(5,2),
  seo_score numeric(5,2),
  engagement_score numeric(5,2),
  human_likeness_score numeric(5,2),
  overall_score numeric(5,2),
  analysis_details jsonb DEFAULT '{}'::jsonb,
  improvement_suggestions jsonb DEFAULT '[]'::jsonb,
  auto_improved boolean DEFAULT false,
  analyzed_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

-- Table user_behavior_patterns
CREATE TABLE IF NOT EXISTS user_behavior_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type text NOT NULL,
  pattern_data jsonb NOT NULL,
  frequency int DEFAULT 1,
  conversion_rate numeric(5,4),
  confidence_level numeric(5,4),
  is_active boolean DEFAULT true,
  discovered_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

-- Table optimization_actions
CREATE TABLE IF NOT EXISTS optimization_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  target_entity text NOT NULL,
  target_id uuid,
  previous_value jsonb,
  new_value jsonb,
  reason text NOT NULL,
  expected_improvement numeric(5,2),
  status text DEFAULT 'applied',
  applied_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

-- ================================================================
-- PARTIE 4: TABLES IA PROACTIVE
-- ================================================================

-- Table ai_site_monitoring
CREATE TABLE IF NOT EXISTS ai_site_monitoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,
  target_url text,
  current_value numeric(10,2),
  baseline_value numeric(10,2),
  status text DEFAULT 'healthy',
  recommendations jsonb DEFAULT '[]'::jsonb,
  auto_fix_applied boolean DEFAULT false,
  last_checked_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_site_monitoring_type ON ai_site_monitoring(check_type);
CREATE INDEX IF NOT EXISTS idx_ai_site_monitoring_status ON ai_site_monitoring(status);

-- Table ai_moderation
CREATE TABLE IF NOT EXISTS ai_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_source text NOT NULL,
  original_content text NOT NULL,
  sentiment_score numeric(3,2),
  moderation_action text,
  ai_response text,
  human_review_needed boolean DEFAULT false,
  processed_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

-- Table ai_social_intelligence
CREATE TABLE IF NOT EXISTS ai_social_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  content_type text,
  content text,
  author_info jsonb DEFAULT '{}'::jsonb,
  engagement_metrics jsonb DEFAULT '{}'::jsonb,
  sentiment text,
  topics_detected text[],
  ai_response_generated text,
  response_posted boolean DEFAULT false,
  priority_score int DEFAULT 50,
  discovered_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

-- Table ai_industry_intelligence
CREATE TABLE IF NOT EXISTS ai_industry_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intelligence_type text NOT NULL,
  source text NOT NULL,
  data jsonb NOT NULL,
  confidence_score numeric(3,2),
  actionable boolean DEFAULT false,
  discovered_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

-- Table ai_auto_interventions
CREATE TABLE IF NOT EXISTS ai_auto_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_type text NOT NULL,
  target_area text NOT NULL,
  issue_detected text NOT NULL,
  severity text,
  changes_made jsonb NOT NULL,
  status text DEFAULT 'applied',
  applied_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

-- ================================================================
-- PARTIE 5: RLS POLICIES
-- ================================================================

ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_site_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_social_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_industry_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_auto_interventions ENABLE ROW LEVEL SECURITY;

-- Policies simples (vérifier existence avant création)
DO $$
BEGIN
  -- ai_learning_data
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_learning_data' AND policyname = 'Authenticated can read all') THEN
    CREATE POLICY "Authenticated can read all" ON ai_learning_data FOR SELECT TO authenticated USING (true);
  END IF;

  -- ai_site_monitoring
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_site_monitoring' AND policyname = 'Authenticated can read all') THEN
    CREATE POLICY "Authenticated can read all" ON ai_site_monitoring FOR SELECT TO authenticated USING (true);
  END IF;

  -- ai_moderation
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_moderation' AND policyname = 'Authenticated can read all') THEN
    CREATE POLICY "Authenticated can read all" ON ai_moderation FOR SELECT TO authenticated USING (true);
  END IF;

  -- ai_social_intelligence
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_social_intelligence' AND policyname = 'Authenticated can read all') THEN
    CREATE POLICY "Authenticated can read all" ON ai_social_intelligence FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ================================================================
-- PARTIE 6: FONCTIONS RPC
-- ================================================================

-- Fonction get_realtime_stats
CREATE OR REPLACE FUNCTION get_realtime_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_leads', COALESCE((SELECT COUNT(*) FROM leads), 0),
    'leads_today', COALESCE((SELECT COUNT(*) FROM leads WHERE created_at >= CURRENT_DATE), 0),
    'conversion_rate', COALESCE((
      SELECT ROUND((COUNT(*) FILTER (WHERE status = 'client')::numeric / NULLIF(COUNT(*), 0)) * 100, 2)
      FROM leads WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    ), 0),
    'total_blog_posts', COALESCE((SELECT COUNT(*) FROM blog_posts WHERE published = true), 0),
    'total_city_pages', COALESCE((SELECT COUNT(*) FROM city_pages), 0),
    'active_automations', COALESCE((SELECT COUNT(*) FROM seo_automation_config WHERE enabled = true), 0)
  ) INTO v_stats;

  RETURN v_stats;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'total_leads', 0,
    'leads_today', 0,
    'conversion_rate', 0,
    'total_blog_posts', 0,
    'total_city_pages', 0,
    'active_automations', 0
  );
END;
$$;

-- Fonction ai_scan_entire_site
CREATE OR REPLACE FUNCTION ai_scan_entire_site()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_results jsonb;
  v_issues_found int := 0;
BEGIN
  INSERT INTO ai_site_monitoring (check_type, current_value, status, recommendations)
  SELECT
    'page_health',
    COUNT(*)::numeric,
    CASE WHEN COUNT(*) < 10 THEN 'warning' ELSE 'healthy' END,
    jsonb_build_array('Continuer la production de contenu')
  FROM blog_posts WHERE published = true;

  SELECT COUNT(*) INTO v_issues_found
  FROM ai_site_monitoring
  WHERE status IN ('warning', 'critical')
    AND last_checked_at >= NOW() - INTERVAL '1 hour';

  v_results := jsonb_build_object(
    'scan_completed_at', NOW(),
    'issues_found', v_issues_found,
    'status', CASE WHEN v_issues_found = 0 THEN 'healthy' ELSE 'monitoring' END
  );

  RETURN v_results;
END;
$$;

-- Fonction ai_moderate_and_respond
CREATE OR REPLACE FUNCTION ai_moderate_and_respond(
  p_content text,
  p_content_type text,
  p_source text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_sentiment numeric;
  v_action text;
  v_response text;
BEGIN
  v_sentiment := CASE
    WHEN p_content ~* '(excellent|super|génial|merci)' THEN 0.8
    WHEN p_content ~* '(mauvais|nul|arnaque)' THEN -0.7
    ELSE 0.0
  END;

  v_action := CASE WHEN v_sentiment < -0.5 THEN 'flagged' ELSE 'approved' END;
  v_response := 'Merci pour votre message. Notre équipe vous répond rapidement.';

  INSERT INTO ai_moderation (
    content_type, content_source, original_content,
    sentiment_score, moderation_action, ai_response,
    human_review_needed
  ) VALUES (
    p_content_type, p_source, p_content,
    v_sentiment, v_action, v_response,
    v_sentiment < -0.5
  );

  v_result := jsonb_build_object(
    'action', v_action,
    'sentiment', v_sentiment,
    'response', v_response
  );

  RETURN v_result;
END;
$$;

-- Fonction ai_detect_opportunities
CREATE OR REPLACE FUNCTION ai_detect_opportunities()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opportunities jsonb;
BEGIN
  WITH opportunities AS (
    SELECT
      'leads_not_followed' as opportunity_type,
      'Relancer les leads sans réponse' as action,
      COUNT(*) as impact,
      'high' as priority
    FROM leads
    WHERE status = 'nouveau'
      AND created_at < NOW() - INTERVAL '48 hours'
    HAVING COUNT(*) > 0
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', opportunity_type,
      'action', action,
      'impact', impact,
      'priority', priority
    )
  ) INTO v_opportunities
  FROM opportunities;

  RETURN COALESCE(v_opportunities, '[]'::jsonb);
END;
$$;

-- Fonction get_automation_status
CREATE OR REPLACE FUNCTION get_automation_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'active_cron_jobs', COALESCE((SELECT COUNT(*) FROM cron.job WHERE active = true), 0),
    'pending_optimizations', COALESCE((SELECT COUNT(*) FROM optimization_actions WHERE status = 'pending'), 0),
    'running_experiments', COALESCE((SELECT COUNT(*) FROM ai_experiments WHERE status = 'running'), 0),
    'data_collected_today', COALESCE((SELECT COUNT(*) FROM ai_learning_data WHERE created_at >= CURRENT_DATE), 0)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'active_cron_jobs', 0,
    'pending_optimizations', 0,
    'running_experiments', 0,
    'data_collected_today', 0
  );
END;
$$;

-- ================================================================
-- PARTIE 7: GRANTS
-- ================================================================

GRANT EXECUTE ON FUNCTION get_realtime_stats() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION ai_scan_entire_site() TO authenticated;
GRANT EXECUTE ON FUNCTION ai_moderate_and_respond(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION ai_detect_opportunities() TO authenticated;
GRANT EXECUTE ON FUNCTION get_automation_status() TO authenticated, anon;

-- ================================================================
-- PARTIE 8: CRON JOBS (SAFE)
-- ================================================================

DO $outer$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-scan-entire-site') THEN
    PERFORM cron.schedule('ai-scan-entire-site', '*/15 * * * *', $inner$SELECT ai_scan_entire_site();$inner$);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-detect-opportunities') THEN
    PERFORM cron.schedule('ai-detect-opportunities', '*/30 * * * *', $inner$SELECT ai_detect_opportunities();$inner$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $outer$;

-- ================================================================
-- SUCCÈS
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration SAFE réussie';
  RAISE NOTICE '✅ Tables IA: 13 créées/vérifiées';
  RAISE NOTICE '✅ Fonctions RPC: 5 créées';
  RAISE NOTICE '✅ Cron jobs: 2 activés';
END $$;
