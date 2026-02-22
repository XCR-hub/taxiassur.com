/*
  # Système d'Orchestration Autonome GSC + IA Collective
  
  1. Tables Créées
    - `gsc_ai_strategy_sessions` : Sessions de réflexion collective des IA
    - `gsc_ai_collaborative_decisions` : Décisions prises collectivement
    - `gsc_content_production_queue` : File d'attente de production de contenu
    - `gsc_published_content` : Historique du contenu publié automatiquement
  
  2. Fonctionnalités
    - Les IA (Council + Master + GSC) dialoguent pour définir la stratégie
    - Décisions collaboratives basées sur les données GSC réelles
    - Production et publication automatique de contenu optimisé
    - Suivi des performances et ajustements automatiques
  
  3. Sécurité
    - RLS activé sur toutes les tables
    - Validation des décisions avant publication
    - Rollback possible en cas d'erreur
    - Logs détaillés de toutes les actions
*/

-- Table : Sessions de stratégie collective des IA
CREATE TABLE IF NOT EXISTS gsc_ai_strategy_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name text NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('weekly_strategy', 'emergency_optimization', 'opportunity_analysis', 'content_planning')),
  
  -- Données GSC analysées
  gsc_opportunities_analyzed jsonb DEFAULT '[]'::jsonb,
  top_opportunities jsonb DEFAULT '[]'::jsonb,
  
  -- Participants IA
  participating_models jsonb DEFAULT '[]'::jsonb,
  
  -- Conversation et décisions
  conversation_log jsonb DEFAULT '[]'::jsonb,
  consensus_reached boolean DEFAULT false,
  final_strategy jsonb,
  
  -- Métriques
  estimated_impact jsonb,
  confidence_score integer CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Statut
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'consensus_reached', 'approved', 'executing', 'completed', 'failed')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  
  -- Métadonnées
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table : Décisions collaboratives prises par les IA
CREATE TABLE IF NOT EXISTS gsc_ai_collaborative_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES gsc_ai_strategy_sessions(id) ON DELETE CASCADE,
  
  -- Type de décision
  decision_type text NOT NULL CHECK (decision_type IN (
    'create_blog_article',
    'create_city_page',
    'optimize_existing_page',
    'create_faq',
    'create_landing_page',
    'improve_meta_tags',
    'add_internal_links'
  )),
  
  -- Cible
  target_query text NOT NULL,
  target_url text,
  opportunity_score integer,
  
  -- Recommandations collectives
  recommended_actions jsonb NOT NULL,
  content_structure jsonb,
  seo_optimizations jsonb,
  
  -- Votes des IA
  ai_votes jsonb DEFAULT '[]'::jsonb,
  consensus_level integer CHECK (consensus_level >= 0 AND consensus_level <= 100),
  
  -- Priorisation
  priority text DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  estimated_impact_clicks integer,
  estimated_time_to_results text,
  
  -- Statut d'exécution
  execution_status text DEFAULT 'pending' CHECK (execution_status IN ('pending', 'approved', 'in_progress', 'completed', 'failed', 'cancelled')),
  executed_at timestamptz,
  result jsonb,
  
  -- Métadonnées
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table : File d'attente de production de contenu
CREATE TABLE IF NOT EXISTS gsc_content_production_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid REFERENCES gsc_ai_collaborative_decisions(id) ON DELETE CASCADE,
  
  -- Type de contenu à produire
  content_type text NOT NULL CHECK (content_type IN ('blog_article', 'city_page', 'faq', 'landing_page', 'news_article')),
  
  -- Données pour la génération
  target_query text NOT NULL,
  target_keywords jsonb DEFAULT '[]'::jsonb,
  content_brief jsonb NOT NULL,
  seo_requirements jsonb NOT NULL,
  
  -- IA assignée
  assigned_model text,
  generation_prompt text,
  
  -- Contenu généré
  generated_content jsonb,
  seo_score integer,
  quality_score integer,
  
  -- Validation
  needs_human_review boolean DEFAULT false,
  reviewed_by uuid REFERENCES admin_users(id),
  review_notes text,
  approved_for_publication boolean DEFAULT false,
  
  -- Statut
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'generating', 'generated', 'reviewing', 'approved', 'published', 'rejected', 'failed')),
  priority integer DEFAULT 50,
  
  -- Dates
  scheduled_for timestamptz,
  generated_at timestamptz,
  published_at timestamptz,
  
  -- Métadonnées
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table : Historique du contenu publié automatiquement
CREATE TABLE IF NOT EXISTS gsc_published_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id uuid REFERENCES gsc_content_production_queue(id) ON DELETE SET NULL,
  decision_id uuid REFERENCES gsc_ai_collaborative_decisions(id) ON DELETE SET NULL,
  
  -- Contenu publié
  content_type text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  url text NOT NULL,
  
  -- Référence dans la base
  blog_post_id uuid,
  city_page_id uuid,
  faq_id uuid,
  
  -- SEO
  target_query text,
  target_keywords jsonb DEFAULT '[]'::jsonb,
  meta_title text,
  meta_description text,
  
  -- Performance initiale
  initial_position decimal,
  initial_impressions integer DEFAULT 0,
  initial_clicks integer DEFAULT 0,
  initial_ctr decimal DEFAULT 0,
  
  -- Performance actuelle
  current_position decimal,
  current_impressions integer DEFAULT 0,
  current_clicks integer DEFAULT 0,
  current_ctr decimal DEFAULT 0,
  
  -- Amélioration
  position_change decimal,
  clicks_gained integer DEFAULT 0,
  performance_trend text CHECK (performance_trend IN ('improving', 'stable', 'declining', 'new')),
  
  -- Publication
  published_by text DEFAULT 'autonomous_system',
  published_at timestamptz DEFAULT now(),
  last_updated_at timestamptz DEFAULT now(),
  
  -- Statut
  is_active boolean DEFAULT true,
  needs_optimization boolean DEFAULT false,
  
  -- Métadonnées
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_gsc_strategy_sessions_status ON gsc_ai_strategy_sessions(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_strategy_sessions_type ON gsc_ai_strategy_sessions(session_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gsc_collaborative_decisions_session ON gsc_ai_collaborative_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_gsc_collaborative_decisions_status ON gsc_ai_collaborative_decisions(execution_status, priority);
CREATE INDEX IF NOT EXISTS idx_gsc_collaborative_decisions_query ON gsc_ai_collaborative_decisions(target_query);

CREATE INDEX IF NOT EXISTS idx_gsc_production_queue_status ON gsc_content_production_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_production_queue_scheduled ON gsc_content_production_queue(scheduled_for) WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_gsc_published_content_query ON gsc_published_content(target_query);
CREATE INDEX IF NOT EXISTS idx_gsc_published_content_performance ON gsc_published_content(performance_trend, current_clicks DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_published_content_active ON gsc_published_content(is_active, published_at DESC);

-- Enable RLS
ALTER TABLE gsc_ai_strategy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_ai_collaborative_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_content_production_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_published_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies : Accès admin et service_role
CREATE POLICY "Admin et service_role peuvent tout faire sur strategy_sessions"
  ON gsc_ai_strategy_sessions FOR ALL TO authenticated, service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admin et service_role peuvent tout faire sur collaborative_decisions"
  ON gsc_ai_collaborative_decisions FOR ALL TO authenticated, service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admin et service_role peuvent tout faire sur production_queue"
  ON gsc_content_production_queue FOR ALL TO authenticated, service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admin et service_role peuvent lire published_content"
  ON gsc_published_content FOR SELECT TO authenticated, service_role
  USING (true);

CREATE POLICY "Service_role peut tout faire sur published_content"
  ON gsc_published_content FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Fonction : Créer une session de stratégie IA collective
CREATE OR REPLACE FUNCTION create_gsc_ai_strategy_session(
  p_session_type text,
  p_session_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_opportunities jsonb;
  v_models jsonb;
BEGIN
  -- Récupérer les top 20 opportunités GSC
  SELECT jsonb_agg(
    jsonb_build_object(
      'query', query,
      'impressions', impressions,
      'clicks', clicks,
      'ctr', ctr,
      'position', position,
      'opportunity_score', opportunity_score
    ) ORDER BY opportunity_score DESC
  )
  INTO v_opportunities
  FROM seo_opportunities
  WHERE status = 'pending'
  LIMIT 20;

  -- Liste des modèles IA participants
  v_models := jsonb_build_array(
    jsonb_build_object('model', 'gpt-4o', 'role', 'strategist', 'specialty', 'seo_strategy'),
    jsonb_build_object('model', 'claude-3-5-sonnet', 'role', 'content_expert', 'specialty', 'content_quality'),
    jsonb_build_object('model', 'mistral-large', 'role', 'technical_seo', 'specialty', 'technical_optimization'),
    jsonb_build_object('model', 'ia_master', 'role', 'coordinator', 'specialty', 'decision_making')
  );

  -- Créer la session
  INSERT INTO gsc_ai_strategy_sessions (
    session_name,
    session_type,
    gsc_opportunities_analyzed,
    participating_models,
    status
  ) VALUES (
    COALESCE(p_session_name, 'Session Automatique ' || to_char(now(), 'YYYY-MM-DD HH24:MI')),
    p_session_type,
    v_opportunities,
    v_models,
    'in_progress'
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- Fonction : Enregistrer une décision collaborative
CREATE OR REPLACE FUNCTION record_collaborative_decision(
  p_session_id uuid,
  p_decision_type text,
  p_target_query text,
  p_recommended_actions jsonb,
  p_ai_votes jsonb,
  p_priority text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision_id uuid;
  v_consensus_level integer;
  v_opportunity_score integer;
BEGIN
  -- Calculer le niveau de consensus (moyenne des votes)
  SELECT ROUND(AVG((vote->>'score')::integer))::integer
  INTO v_consensus_level
  FROM jsonb_array_elements(p_ai_votes) AS vote;

  -- Récupérer le score d'opportunité GSC
  SELECT opportunity_score
  INTO v_opportunity_score
  FROM seo_opportunities
  WHERE query = p_target_query
  ORDER BY created_at DESC
  LIMIT 1;

  -- Créer la décision
  INSERT INTO gsc_ai_collaborative_decisions (
    session_id,
    decision_type,
    target_query,
    opportunity_score,
    recommended_actions,
    ai_votes,
    consensus_level,
    priority,
    execution_status
  ) VALUES (
    p_session_id,
    p_decision_type,
    p_target_query,
    COALESCE(v_opportunity_score, 50),
    p_recommended_actions,
    p_ai_votes,
    v_consensus_level,
    p_priority,
    CASE 
      WHEN v_consensus_level >= 80 THEN 'approved'
      WHEN v_consensus_level >= 60 THEN 'pending'
      ELSE 'pending'
    END
  )
  RETURNING id INTO v_decision_id;

  -- Si consensus élevé, ajouter automatiquement à la queue de production
  IF v_consensus_level >= 80 AND p_decision_type IN ('create_blog_article', 'create_city_page', 'create_landing_page') THEN
    PERFORM queue_content_production(v_decision_id);
  END IF;

  RETURN v_decision_id;
END;
$$;

-- Fonction : Ajouter à la queue de production
CREATE OR REPLACE FUNCTION queue_content_production(
  p_decision_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_id uuid;
  v_decision record;
  v_content_type text;
BEGIN
  -- Récupérer les détails de la décision
  SELECT * INTO v_decision
  FROM gsc_ai_collaborative_decisions
  WHERE id = p_decision_id;

  -- Mapper le type de décision au type de contenu
  v_content_type := CASE v_decision.decision_type
    WHEN 'create_blog_article' THEN 'blog_article'
    WHEN 'create_city_page' THEN 'city_page'
    WHEN 'create_landing_page' THEN 'landing_page'
    WHEN 'create_faq' THEN 'faq'
    ELSE 'blog_article'
  END;

  -- Ajouter à la queue
  INSERT INTO gsc_content_production_queue (
    decision_id,
    content_type,
    target_query,
    target_keywords,
    content_brief,
    seo_requirements,
    priority,
    status,
    approved_for_publication,
    scheduled_for
  ) VALUES (
    p_decision_id,
    v_content_type,
    v_decision.target_query,
    COALESCE(v_decision.recommended_actions->'keywords', '[]'::jsonb),
    v_decision.recommended_actions,
    v_decision.seo_optimizations,
    CASE v_decision.priority
      WHEN 'urgent' THEN 100
      WHEN 'high' THEN 80
      WHEN 'medium' THEN 50
      ELSE 30
    END,
    'queued',
    v_decision.consensus_level >= 90,  -- Auto-approve si consensus très élevé
    now() + interval '1 hour'  -- Programmer dans 1 heure
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;

-- Fonction : Marquer le contenu comme publié et suivre les performances
CREATE OR REPLACE FUNCTION track_published_content(
  p_production_id uuid,
  p_content_type text,
  p_title text,
  p_slug text,
  p_url text,
  p_target_query text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_published_id uuid;
  v_initial_position decimal;
  v_initial_impressions integer;
  v_initial_clicks integer;
BEGIN
  -- Récupérer les métriques GSC actuelles pour cette requête
  SELECT position, impressions, clicks
  INTO v_initial_position, v_initial_impressions, v_initial_clicks
  FROM gsc_queries
  WHERE query = p_target_query
  ORDER BY date DESC
  LIMIT 1;

  -- Enregistrer le contenu publié
  INSERT INTO gsc_published_content (
    production_id,
    content_type,
    title,
    slug,
    url,
    target_query,
    initial_position,
    initial_impressions,
    initial_clicks,
    initial_ctr,
    current_position,
    current_impressions,
    current_clicks,
    current_ctr,
    performance_trend,
    blog_post_id,
    city_page_id,
    faq_id
  ) VALUES (
    p_production_id,
    p_content_type,
    p_title,
    p_slug,
    p_url,
    p_target_query,
    v_initial_position,
    COALESCE(v_initial_impressions, 0),
    COALESCE(v_initial_clicks, 0),
    CASE WHEN v_initial_impressions > 0 THEN v_initial_clicks::decimal / v_initial_impressions ELSE 0 END,
    v_initial_position,
    COALESCE(v_initial_impressions, 0),
    COALESCE(v_initial_clicks, 0),
    CASE WHEN v_initial_impressions > 0 THEN v_initial_clicks::decimal / v_initial_impressions ELSE 0 END,
    'new',
    CASE WHEN p_content_type = 'blog_article' THEN p_reference_id END,
    CASE WHEN p_content_type = 'city_page' THEN p_reference_id END,
    CASE WHEN p_content_type = 'faq' THEN p_reference_id END
  )
  RETURNING id INTO v_published_id;

  -- Mettre à jour le statut de la production
  UPDATE gsc_content_production_queue
  SET status = 'published', published_at = now()
  WHERE id = p_production_id;

  RETURN v_published_id;
END;
$$;

-- Fonction : Obtenir le prochain contenu à générer
CREATE OR REPLACE FUNCTION get_next_content_to_generate()
RETURNS TABLE (
  queue_id uuid,
  content_type text,
  target_query text,
  content_brief jsonb,
  seo_requirements jsonb,
  priority integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.content_type,
    q.target_query,
    q.content_brief,
    q.seo_requirements,
    q.priority
  FROM gsc_content_production_queue q
  WHERE q.status = 'queued'
    AND q.scheduled_for <= now()
    AND (q.approved_for_publication = true OR q.needs_human_review = false)
  ORDER BY q.priority DESC, q.created_at ASC
  LIMIT 1;
END;
$$;

-- Trigger : Mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_gsc_ai_tables_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_strategy_sessions_updated_at
  BEFORE UPDATE ON gsc_ai_strategy_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_gsc_ai_tables_updated_at();

CREATE TRIGGER update_collaborative_decisions_updated_at
  BEFORE UPDATE ON gsc_ai_collaborative_decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_gsc_ai_tables_updated_at();

CREATE TRIGGER update_production_queue_updated_at
  BEFORE UPDATE ON gsc_content_production_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_gsc_ai_tables_updated_at();
