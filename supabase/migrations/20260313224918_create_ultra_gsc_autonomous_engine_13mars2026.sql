/*
  # Système Autonome Ultra-Intelligent GSC
  
  Crée un moteur IA qui :
  1. Enrichit automatiquement les pages sous-performantes
  2. Soumet intelligemment à Google (IndexNow + GSC API)
  3. Auto-apprend des patterns de succès
  4. Monitoring temps réel
  
  ## Tables créées
  - gsc_autonomous_tasks : Queue des actions à exécuter
  - gsc_optimization_history : Historique des optimisations
  - gsc_learning_patterns : Patterns appris par l'IA
  
  ## Sécurité
  - RLS activée sur toutes les tables
  - Accès service_role pour les crons
*/

-- Table des tâches autonomes
CREATE TABLE IF NOT EXISTS gsc_autonomous_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL CHECK (task_type IN ('enrich_content', 'add_internal_links', 'submit_indexation', 'optimize_metadata')),
  target_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority integer NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
  current_metrics jsonb,
  target_metrics jsonb,
  ai_strategy jsonb,
  result jsonb,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text
);

ALTER TABLE gsc_autonomous_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access gsc_autonomous_tasks"
  ON gsc_autonomous_tasks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_gsc_tasks_status ON gsc_autonomous_tasks(status, priority DESC);
CREATE INDEX idx_gsc_tasks_url ON gsc_autonomous_tasks(target_url);

-- Table historique des optimisations
CREATE TABLE IF NOT EXISTS gsc_optimization_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  optimization_type text NOT NULL,
  metrics_before jsonb NOT NULL,
  metrics_after jsonb,
  content_changes jsonb,
  indexation_status_before text,
  indexation_status_after text,
  success boolean,
  ai_confidence_score numeric(3,2),
  applied_at timestamptz DEFAULT now(),
  validated_at timestamptz
);

ALTER TABLE gsc_optimization_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access gsc_optimization_history"
  ON gsc_optimization_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_gsc_optimization_url ON gsc_optimization_history(url);
CREATE INDEX idx_gsc_optimization_success ON gsc_optimization_history(success) WHERE success = true;

-- Table des patterns appris par l'IA
CREATE TABLE IF NOT EXISTS gsc_learning_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name text NOT NULL,
  pattern_type text NOT NULL CHECK (pattern_type IN ('content_length', 'internal_links', 'metadata', 'semantic')),
  conditions jsonb NOT NULL,
  actions jsonb NOT NULL,
  success_rate numeric(5,2) DEFAULT 0,
  samples_count integer DEFAULT 0,
  last_validated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

ALTER TABLE gsc_learning_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access gsc_learning_patterns"
  ON gsc_learning_patterns FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fonction : Détecter automatiquement les pages à optimiser
CREATE OR REPLACE FUNCTION detect_pages_needing_optimization()
RETURNS TABLE (
  url text,
  issue_type text,
  priority integer,
  current_metrics jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH page_stats AS (
    SELECT 
      p.url,
      AVG(p.impressions) as avg_impressions,
      AVG(p.ctr) as avg_ctr,
      AVG(p.position) as avg_position,
      COUNT(*) as data_points
    FROM gsc_pages p
    WHERE p.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY p.url
  )
  SELECT 
    ps.url,
    CASE 
      WHEN ps.avg_impressions > 100 AND ps.avg_ctr < 0.02 THEN 'low_ctr_high_impressions'
      WHEN ps.avg_position > 10 AND ps.avg_impressions > 50 THEN 'poor_ranking'
      WHEN ps.avg_impressions < 10 THEN 'no_visibility'
      ELSE 'needs_boost'
    END as issue_type,
    CASE 
      WHEN ps.avg_impressions > 100 AND ps.avg_ctr < 0.02 THEN 90
      WHEN ps.avg_position > 10 AND ps.avg_impressions > 50 THEN 80
      ELSE 50
    END as priority,
    jsonb_build_object(
      'impressions', ps.avg_impressions,
      'ctr', ps.avg_ctr,
      'position', ps.avg_position,
      'data_points', ps.data_points
    ) as current_metrics
  FROM page_stats ps
  WHERE ps.data_points >= 7
  ORDER BY priority DESC
  LIMIT 50;
END;
$$;

-- Fonction : Créer automatiquement les tâches d'optimisation
CREATE OR REPLACE FUNCTION auto_create_optimization_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tasks_created integer := 0;
  page_record record;
BEGIN
  FOR page_record IN 
    SELECT * FROM detect_pages_needing_optimization()
  LOOP
    -- Vérifier si une tâche existe déjà pour cette URL
    IF NOT EXISTS (
      SELECT 1 FROM gsc_autonomous_tasks 
      WHERE target_url = page_record.url 
      AND status IN ('pending', 'processing')
    ) THEN
      INSERT INTO gsc_autonomous_tasks (
        task_type,
        target_url,
        priority,
        current_metrics,
        ai_strategy
      ) VALUES (
        'enrich_content',
        page_record.url,
        page_record.priority,
        page_record.current_metrics,
        jsonb_build_object(
          'issue_type', page_record.issue_type,
          'strategy', 'ai_content_enrichment',
          'min_words', 500,
          'target_internal_links', 5
        )
      );
      tasks_created := tasks_created + 1;
    END IF;
  END LOOP;
  
  RETURN tasks_created;
END;
$$;

-- Fonction : Calculer le succès d'une optimisation
CREATE OR REPLACE FUNCTION calculate_optimization_success(
  p_url text,
  p_optimization_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metrics_before jsonb;
  metrics_after jsonb;
  improvement_threshold numeric := 0.15; -- 15% d'amélioration
  ctr_before numeric;
  ctr_after numeric;
BEGIN
  SELECT 
    oh.metrics_before,
    oh.metrics_after
  INTO metrics_before, metrics_after
  FROM gsc_optimization_history oh
  WHERE oh.id = p_optimization_id;
  
  IF metrics_before IS NULL OR metrics_after IS NULL THEN
    RETURN false;
  END IF;
  
  ctr_before := (metrics_before->>'ctr')::numeric;
  ctr_after := (metrics_after->>'ctr')::numeric;
  
  RETURN ctr_after > ctr_before * (1 + improvement_threshold);
END;
$$;

-- Fonction : Apprendre des succès
CREATE OR REPLACE FUNCTION learn_from_successful_optimizations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  patterns_created integer := 0;
BEGIN
  -- Analyser les optimisations réussies des 30 derniers jours
  WITH successful_opts AS (
    SELECT 
      optimization_type,
      content_changes,
      metrics_before,
      metrics_after
    FROM gsc_optimization_history
    WHERE success = true
    AND applied_at >= CURRENT_DATE - INTERVAL '30 days'
  )
  -- Créer ou mettre à jour des patterns
  INSERT INTO gsc_learning_patterns (
    pattern_name,
    pattern_type,
    conditions,
    actions,
    success_rate,
    samples_count
  )
  SELECT 
    'Auto-learned: ' || optimization_type,
    'content_length',
    jsonb_build_object(
      'min_impressions', 100,
      'max_ctr', 0.03
    ),
    jsonb_agg(content_changes),
    100.0,
    COUNT(*)
  FROM successful_opts
  GROUP BY optimization_type
  HAVING COUNT(*) >= 3
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS patterns_created = ROW_COUNT;
  RETURN patterns_created;
END;
$$;

-- Fonction : Obtenir la prochaine tâche à exécuter
CREATE OR REPLACE FUNCTION get_next_optimization_task()
RETURNS TABLE (
  task_id uuid,
  task_type text,
  target_url text,
  priority integer,
  ai_strategy jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE gsc_autonomous_tasks
  SET 
    status = 'processing',
    started_at = now()
  WHERE id = (
    SELECT id 
    FROM gsc_autonomous_tasks
    WHERE status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    id as task_id,
    gsc_autonomous_tasks.task_type,
    gsc_autonomous_tasks.target_url,
    gsc_autonomous_tasks.priority,
    gsc_autonomous_tasks.ai_strategy;
END;
$$;

-- Fonction : Marquer une tâche comme complétée
CREATE OR REPLACE FUNCTION complete_optimization_task(
  p_task_id uuid,
  p_success boolean,
  p_result jsonb,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE gsc_autonomous_tasks
  SET 
    status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    completed_at = now(),
    result = p_result,
    error_message = p_error_message
  WHERE id = p_task_id;
END;
$$;

-- Fonction : Stats du système autonome
CREATE OR REPLACE FUNCTION get_autonomous_system_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'pending_tasks', (SELECT COUNT(*) FROM gsc_autonomous_tasks WHERE status = 'pending'),
    'processing_tasks', (SELECT COUNT(*) FROM gsc_autonomous_tasks WHERE status = 'processing'),
    'completed_today', (SELECT COUNT(*) FROM gsc_autonomous_tasks WHERE status = 'completed' AND completed_at >= CURRENT_DATE),
    'failed_today', (SELECT COUNT(*) FROM gsc_autonomous_tasks WHERE status = 'failed' AND completed_at >= CURRENT_DATE),
    'success_rate_7d', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE success = true) * 100.0 / NULLIF(COUNT(*), 0), 
        2
      )
      FROM gsc_optimization_history
      WHERE applied_at >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'learned_patterns', (SELECT COUNT(*) FROM gsc_learning_patterns WHERE is_active = true),
    'avg_ctr_improvement', (
      SELECT ROUND(
        AVG(
          ((metrics_after->>'ctr')::numeric - (metrics_before->>'ctr')::numeric) / 
          NULLIF((metrics_before->>'ctr')::numeric, 0) * 100
        ),
        2
      )
      FROM gsc_optimization_history
      WHERE success = true
      AND applied_at >= CURRENT_DATE - INTERVAL '7 days'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;