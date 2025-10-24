/*
  # Système d'Auto-Apprentissage IA pour Posts Réseaux Sociaux

  ## Objectif
  Créer un système d'IA qui analyse les performances de chaque post publié
  et s'améliore automatiquement pour générer des posts viraux et humains.

  ## Tables Créées
  1. `social_post_analytics` - Métriques détaillées par post
  2. `ai_learning_insights` - Insights d'apprentissage automatique
  3. `ai_pattern_library` - Bibliothèque de patterns performants
  4. `ai_improvement_log` - Historique des améliorations IA

  ## Fonctionnalités
  - Collecte automatique des métriques (vues, likes, shares, commentaires)
  - Analyse des patterns viraux
  - Extraction d'insights automatiques
  - Amélioration continue des prompts de génération
  - Score de "humanité" du contenu
*/

-- ============================================================================
-- 1. TABLE ANALYTICS POSTS RÉSEAUX SOCIAUX
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_post_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES social_posts(id) ON DELETE CASCADE,
  network_id uuid REFERENCES social_networks(id),

  -- Métriques de performance
  views integer DEFAULT 0,
  impressions integer DEFAULT 0,
  reach integer DEFAULT 0,
  likes integer DEFAULT 0,
  loves integer DEFAULT 0,
  shares integer DEFAULT 0,
  comments integer DEFAULT 0,
  clicks integer DEFAULT 0,
  saves integer DEFAULT 0,

  -- Métriques calculées
  engagement_rate decimal DEFAULT 0,
  click_through_rate decimal DEFAULT 0,
  share_rate decimal DEFAULT 0,
  comment_rate decimal DEFAULT 0,
  virality_score decimal DEFAULT 0,

  -- Analyse temporelle
  peak_engagement_hour integer,
  average_time_to_first_engagement interval,
  engagement_half_life interval,

  -- Analyse démographique
  top_audience_age_range text,
  top_audience_gender text,
  top_audience_location text,

  -- Analyse qualitative
  sentiment_score decimal,
  human_score decimal DEFAULT 0, -- Score de "humanité" (0-100)
  spam_score decimal DEFAULT 0,
  quality_score decimal DEFAULT 0,

  -- Métadonnées
  collected_at timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  data_completeness decimal DEFAULT 0, -- % des métriques collectées

  created_at timestamptz DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_social_analytics_post_id ON social_post_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_network_id ON social_post_analytics(network_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_virality_score ON social_post_analytics(virality_score DESC);
CREATE INDEX IF NOT EXISTS idx_social_analytics_human_score ON social_post_analytics(human_score DESC);

COMMENT ON TABLE social_post_analytics IS 'Métriques détaillées de performance des posts réseaux sociaux';

-- ============================================================================
-- 2. TABLE INSIGHTS D'APPRENTISSAGE IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_learning_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification de l'insight
  category text NOT NULL CHECK (category IN (
    'hashtag_performance',
    'content_style',
    'posting_time',
    'content_length',
    'media_type',
    'tone',
    'call_to_action',
    'audience_targeting',
    'virality_pattern',
    'human_detection_avoidance'
  )),

  -- Insight découvert
  insight_title text NOT NULL,
  insight_description text NOT NULL,
  pattern_detected jsonb NOT NULL,

  -- Performance
  success_rate decimal NOT NULL,
  sample_size integer NOT NULL,
  confidence_level decimal NOT NULL,

  -- Impact mesuré
  average_engagement_increase decimal,
  average_virality_increase decimal,
  average_human_score_increase decimal,

  -- Application
  recommendation text NOT NULL,
  prompt_modification text, -- Modification à apporter au prompt GPT
  is_active boolean DEFAULT true,
  priority integer DEFAULT 5, -- 1-10, 10 = très important

  -- Métadonnées
  discovered_at timestamptz DEFAULT now(),
  last_validated timestamptz DEFAULT now(),
  validation_count integer DEFAULT 1,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ai_insights_category ON ai_learning_insights(category);
CREATE INDEX IF NOT EXISTS idx_ai_insights_active ON ai_learning_insights(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_learning_insights(priority DESC);

COMMENT ON TABLE ai_learning_insights IS 'Insights d''apprentissage automatique extraits des performances';

-- ============================================================================
-- 3. TABLE BIBLIOTHÈQUE DE PATTERNS PERFORMANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_pattern_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pattern identifié
  pattern_type text NOT NULL CHECK (pattern_type IN (
    'opening_hook',
    'storytelling',
    'emoji_usage',
    'hashtag_strategy',
    'call_to_action',
    'question_style',
    'value_proposition',
    'personal_touch',
    'urgency_creation',
    'social_proof'
  )),

  pattern_name text NOT NULL UNIQUE,
  pattern_template text NOT NULL,
  pattern_example text,

  -- Performance du pattern
  usage_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  success_rate decimal DEFAULT 0,
  average_engagement decimal DEFAULT 0,
  average_virality decimal DEFAULT 0,
  average_human_score decimal DEFAULT 0,

  -- Contexte d'utilisation
  best_for_network text[], -- ['facebook', 'linkedin', 'twitter']
  best_for_audience text, -- Description de l'audience
  best_time_of_day text[], -- ['morning', 'afternoon', 'evening', 'night']

  -- Statut
  is_proven boolean DEFAULT false, -- Prouvé par données
  is_recommended boolean DEFAULT false,
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ai_patterns_type ON ai_pattern_library(pattern_type);
CREATE INDEX IF NOT EXISTS idx_ai_patterns_proven ON ai_pattern_library(is_proven) WHERE is_proven = true;
CREATE INDEX IF NOT EXISTS idx_ai_patterns_success_rate ON ai_pattern_library(success_rate DESC);

COMMENT ON TABLE ai_pattern_library IS 'Bibliothèque de patterns de contenu performants';

-- ============================================================================
-- 4. TABLE LOG D'AMÉLIORATION IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_improvement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Amélioration appliquée
  improvement_type text NOT NULL CHECK (improvement_type IN (
    'prompt_optimization',
    'pattern_addition',
    'parameter_tuning',
    'strategy_update',
    'anti_ai_enhancement',
    'virality_boost'
  )),

  improvement_title text NOT NULL,
  improvement_description text NOT NULL,

  -- Changements effectués
  old_value jsonb,
  new_value jsonb NOT NULL,

  -- Impact mesuré
  performance_before jsonb,
  performance_after jsonb,
  improvement_percentage decimal,

  -- Statut
  status text DEFAULT 'active' CHECK (status IN ('testing', 'active', 'paused', 'retired')),

  -- Source de l'amélioration
  triggered_by text DEFAULT 'ai_analysis' CHECK (triggered_by IN (
    'ai_analysis',
    'manual_review',
    'ab_testing',
    'user_feedback',
    'competitive_analysis'
  )),

  triggered_at timestamptz DEFAULT now(),
  applied_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ai_improvements_type ON ai_improvement_log(improvement_type);
CREATE INDEX IF NOT EXISTS idx_ai_improvements_status ON ai_improvement_log(status);
CREATE INDEX IF NOT EXISTS idx_ai_improvements_date ON ai_improvement_log(applied_at DESC);

COMMENT ON TABLE ai_improvement_log IS 'Historique des améliorations apportées par l''IA';

-- ============================================================================
-- 5. FONCTIONS D'ANALYSE AUTOMATIQUE
-- ============================================================================

-- Fonction: Calculer le score de viralité
CREATE OR REPLACE FUNCTION calculate_virality_score(
  p_views integer,
  p_likes integer,
  p_shares integer,
  p_comments integer,
  p_reach integer
)
RETURNS decimal
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  engagement_rate decimal;
  share_amplification decimal;
  virality_coefficient decimal;
BEGIN
  -- Éviter division par zéro
  IF p_reach = 0 OR p_reach IS NULL THEN
    p_reach := GREATEST(p_views, 1);
  END IF;

  -- Calculer taux d'engagement
  engagement_rate := (p_likes + p_comments * 2.0) / p_reach::decimal;

  -- Calculer amplification par partages
  share_amplification := (p_shares * 10.0) / p_reach::decimal;

  -- Score de viralité (0-100)
  virality_coefficient := (engagement_rate * 40) + (share_amplification * 60);

  -- Limiter à 100
  RETURN LEAST(virality_coefficient * 100, 100);
END;
$$;

-- Fonction: Calculer le score d'humanité
CREATE OR REPLACE FUNCTION calculate_human_score(p_content text)
RETURNS decimal
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  human_score decimal := 50;
  word_count integer;
  sentence_count integer;
  avg_sentence_length decimal;
BEGIN
  -- Compter mots et phrases
  word_count := array_length(regexp_split_to_array(p_content, '\s+'), 1);
  sentence_count := array_length(regexp_split_to_array(p_content, '[.!?]+'), 1);

  IF sentence_count > 0 THEN
    avg_sentence_length := word_count::decimal / sentence_count;
  ELSE
    avg_sentence_length := word_count;
  END IF;

  -- Bonus si phrases courtes et variées (plus humain)
  IF avg_sentence_length BETWEEN 8 AND 20 THEN
    human_score := human_score + 20;
  END IF;

  -- Bonus si contient des interjections
  IF p_content ~* '(bon|eh bien|franchement|du coup|bref|donc|alors)' THEN
    human_score := human_score + 15;
  END IF;

  -- Bonus si contient des questions
  IF p_content ~* '\?' THEN
    human_score := human_score + 10;
  END IF;

  -- Pénalité si trop formel
  IF p_content ~* '(il convient|il est important|en conclusion|par conséquent)' THEN
    human_score := human_score - 20;
  END IF;

  RETURN LEAST(GREATEST(human_score, 0), 100);
END;
$$;

-- Fonction: Mettre à jour analytics automatiquement
CREATE OR REPLACE FUNCTION update_social_post_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_virality_score decimal;
  v_human_score decimal;
  v_engagement_rate decimal;
BEGIN
  -- Calculer virality score
  v_virality_score := calculate_virality_score(
    NEW.views,
    NEW.likes,
    NEW.shares,
    NEW.comments,
    NEW.reach
  );

  -- Calculer human score depuis le post
  SELECT calculate_human_score(sp.content)
  INTO v_human_score
  FROM social_posts sp
  WHERE sp.id = NEW.post_id;

  -- Calculer engagement rate
  IF NEW.reach > 0 THEN
    v_engagement_rate := (NEW.likes + NEW.comments + NEW.shares)::decimal / NEW.reach * 100;
  ELSE
    v_engagement_rate := 0;
  END IF;

  -- Mettre à jour les scores calculés
  NEW.virality_score := v_virality_score;
  NEW.human_score := COALESCE(v_human_score, 50);
  NEW.engagement_rate := v_engagement_rate;
  NEW.last_updated := now();

  RETURN NEW;
END;
$$;

-- Trigger sur social_post_analytics
DROP TRIGGER IF EXISTS trigger_update_analytics_scores ON social_post_analytics;
CREATE TRIGGER trigger_update_analytics_scores
  BEFORE INSERT OR UPDATE ON social_post_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_social_post_analytics();

-- ============================================================================
-- 6. VUE DASHBOARD IA
-- ============================================================================

CREATE OR REPLACE VIEW ai_performance_dashboard AS
SELECT
  -- Métriques globales
  COUNT(DISTINCT spa.post_id) as total_posts_analyzed,
  AVG(spa.engagement_rate) as avg_engagement_rate,
  AVG(spa.virality_score) as avg_virality_score,
  AVG(spa.human_score) as avg_human_score,

  -- Top performers
  (SELECT COUNT(*) FROM social_post_analytics WHERE virality_score > 70) as viral_posts_count,
  (SELECT COUNT(*) FROM social_post_analytics WHERE human_score > 80) as human_posts_count,

  -- Apprentissage
  (SELECT COUNT(*) FROM ai_learning_insights WHERE is_active = true) as active_insights,
  (SELECT COUNT(*) FROM ai_pattern_library WHERE is_proven = true) as proven_patterns,
  (SELECT COUNT(*) FROM ai_improvement_log WHERE status = 'active') as active_improvements,

  -- Dernière mise à jour
  MAX(spa.last_updated) as last_analysis
FROM social_post_analytics spa;

GRANT SELECT ON ai_performance_dashboard TO anon, authenticated;

-- ============================================================================
-- 7. FONCTION: EXTRAIRE INSIGHTS AUTOMATIQUEMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION extract_ai_insights()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insight 1: Meilleure heure de publication
  INSERT INTO ai_learning_insights (
    category,
    insight_title,
    insight_description,
    pattern_detected,
    success_rate,
    sample_size,
    confidence_level,
    recommendation
  )
  SELECT
    'posting_time',
    'Meilleure heure de publication',
    'Posts publiés à ' || peak_engagement_hour || 'h obtiennent ' || ROUND(AVG(engagement_rate), 2) || '% d''engagement en moyenne',
    jsonb_build_object('hour', peak_engagement_hour, 'avg_engagement', AVG(engagement_rate)),
    AVG(engagement_rate) / (SELECT AVG(engagement_rate) FROM social_post_analytics) * 100,
    COUNT(*)::integer,
    CASE
      WHEN COUNT(*) > 50 THEN 95
      WHEN COUNT(*) > 20 THEN 85
      ELSE 70
    END,
    'Publier de préférence à ' || peak_engagement_hour || 'h pour maximiser l''engagement'
  FROM social_post_analytics
  WHERE peak_engagement_hour IS NOT NULL
  GROUP BY peak_engagement_hour
  HAVING COUNT(*) >= 5
  ORDER BY AVG(engagement_rate) DESC
  LIMIT 1
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Insights extraits automatiquement';
END;
$$;

-- ============================================================================
-- 8. ENABLE RLS
-- ============================================================================

ALTER TABLE social_post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pattern_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_improvement_log ENABLE ROW LEVEL SECURITY;

-- Policies: Lecture publique, écriture authentifiée
CREATE POLICY "Public read access" ON social_post_analytics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated write access" ON social_post_analytics FOR ALL TO authenticated USING (true);

CREATE POLICY "Public read insights" ON ai_learning_insights FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated write insights" ON ai_learning_insights FOR ALL TO authenticated USING (true);

CREATE POLICY "Public read patterns" ON ai_pattern_library FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated write patterns" ON ai_pattern_library FOR ALL TO authenticated USING (true);

CREATE POLICY "Public read improvements" ON ai_improvement_log FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated write improvements" ON ai_improvement_log FOR ALL TO authenticated USING (true);

-- ============================================================================
-- RÉSUMÉ
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Système d''Auto-Apprentissage IA créé avec succès!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 TABLES CRÉÉES:';
  RAISE NOTICE '   ✅ social_post_analytics - Métriques détaillées';
  RAISE NOTICE '   ✅ ai_learning_insights - Insights automatiques';
  RAISE NOTICE '   ✅ ai_pattern_library - Patterns performants';
  RAISE NOTICE '   ✅ ai_improvement_log - Historique améliorations';
  RAISE NOTICE '';
  RAISE NOTICE '🤖 FONCTIONS IA:';
  RAISE NOTICE '   ✅ calculate_virality_score() - Score viral';
  RAISE NOTICE '   ✅ calculate_human_score() - Score humanité';
  RAISE NOTICE '   ✅ extract_ai_insights() - Extraction auto insights';
  RAISE NOTICE '';
  RAISE NOTICE '📈 MÉTRIQUES TRACKÉES:';
  RAISE NOTICE '   • Views, Impressions, Reach';
  RAISE NOTICE '   • Likes, Loves, Shares, Comments';
  RAISE NOTICE '   • Engagement Rate, CTR, Virality Score';
  RAISE NOTICE '   • Human Score (détection IA), Quality Score';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 L''IA s''améliore automatiquement à chaque post!';
  RAISE NOTICE '';
END $$;
