/*
  # Système IA Master Autonome - Tables principales

  1. Tables créées
    - ai_decisions_log
    - ai_performance_metrics
    - ai_keywords_strategy
    - ai_content_performance
    - ai_learning_data
    - ai_optimization_queue

  2. Security
    - RLS enabled
    - Policies for authenticated and anon users
*/

CREATE TABLE IF NOT EXISTS ai_decisions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type text NOT NULL,
  action_taken text NOT NULL,
  data_analyzed jsonb DEFAULT '{}'::jsonb,
  performance_impact jsonb DEFAULT '{}'::jsonb,
  confidence_score numeric(5,2) DEFAULT 0,
  status text DEFAULT 'pending',
  notification_sent boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,
  total_leads integer DEFAULT 0,
  conversion_rate numeric(5,2) DEFAULT 0,
  avg_position_seo numeric(5,2) DEFAULT 0,
  organic_traffic integer DEFAULT 0,
  content_created integer DEFAULT 0,
  keywords_optimized integer DEFAULT 0,
  market_share_estimate numeric(5,2) DEFAULT 0,
  ai_actions_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_keywords_strategy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  search_volume integer DEFAULT 0,
  difficulty integer DEFAULT 50,
  current_position numeric(5,2) DEFAULT 100,
  target_position numeric(5,2) DEFAULT 3,
  priority_score integer DEFAULT 50,
  content_urls text[] DEFAULT '{}',
  last_optimized timestamptz,
  ai_strategy text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_content_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_url text NOT NULL UNIQUE,
  content_type text NOT NULL,
  publish_date timestamptz DEFAULT now(),
  views integer DEFAULT 0,
  leads_generated integer DEFAULT 0,
  conversion_rate numeric(5,2) DEFAULT 0,
  avg_time_on_page integer DEFAULT 0,
  bounce_rate numeric(5,2) DEFAULT 0,
  seo_score integer DEFAULT 0,
  ai_improvement_suggestions jsonb DEFAULT '[]'::jsonb,
  last_ai_optimization timestamptz,
  performance_trend text DEFAULT 'stable',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_learning_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_type text NOT NULL,
  pattern_detected jsonb NOT NULL,
  confidence numeric(5,2) DEFAULT 0,
  applied_to text[] DEFAULT '{}',
  success_rate numeric(5,2) DEFAULT 0,
  times_applied integer DEFAULT 0,
  last_applied timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_optimization_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_type text NOT NULL,
  target_content text NOT NULL,
  priority integer DEFAULT 5,
  scheduled_for timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  ai_reasoning text,
  expected_impact jsonb DEFAULT '{}'::jsonb,
  actual_impact jsonb,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_decisions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_keywords_strategy ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_optimization_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read AI metrics" ON ai_performance_metrics FOR SELECT TO anon USING (true);
CREATE POLICY "Public read AI keywords" ON ai_keywords_strategy FOR SELECT TO anon USING (true);
CREATE POLICY "Auth manage AI decisions" ON ai_decisions_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage AI metrics" ON ai_performance_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage AI keywords" ON ai_keywords_strategy FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage AI content" ON ai_content_performance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage AI learning" ON ai_learning_data FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage AI queue" ON ai_optimization_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);