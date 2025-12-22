/*
  # Système d'Automatisation de Contenu Anti-Détection IA

  1. Nouvelles Tables
    - `content_automation_schedule` : Planning de génération automatique
    - `humanization_patterns` : Patterns d'humanisation (transitions, styles)
    - `content_generation_history` : Historique complet des générations
    - `seo_indexation_tracking` : Suivi indexation Google

  2. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour admin uniquement

  3. Fonctions
    - `schedule_next_content()` : Planifie le prochain contenu
    - `get_next_scheduled_content()` : Récupère le prochain contenu à générer
    - `mark_content_published()` : Marque un contenu comme publié
*/

-- ============================================================================
-- TABLE: content_automation_schedule
-- Planification intelligente de la génération de contenu
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_automation_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Configuration
  keyword text NOT NULL,
  city text NOT NULL,
  secondary_keywords text[],

  -- Planification
  scheduled_at timestamptz NOT NULL,
  published_at timestamptz,

  -- Statut
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'published', 'failed')),

  -- Configuration de variabilité (anti-détection)
  variability_config jsonb DEFAULT '{
    "styleIndex": 0,
    "addTransitions": true,
    "addEmojis": false,
    "targetWordCount": 2000,
    "errorRate": 0.02
  }'::jsonb,

  -- Résultats
  blog_post_id uuid REFERENCES blog_posts(id),
  city_page_id uuid,
  faq_count integer DEFAULT 0,

  -- Métadonnées
  naturalness_score integer, -- 0-100
  google_submitted boolean DEFAULT false,
  google_indexed boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Index
  CONSTRAINT unique_keyword_city_schedule UNIQUE (keyword, city, scheduled_at)
);

CREATE INDEX IF NOT EXISTS idx_schedule_status ON content_automation_schedule(status);
CREATE INDEX IF NOT EXISTS idx_schedule_scheduled_at ON content_automation_schedule(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_schedule_published_at ON content_automation_schedule(published_at);

-- ============================================================================
-- TABLE: humanization_patterns
-- Bibliothèque de patterns pour humaniser le contenu
-- ============================================================================
CREATE TABLE IF NOT EXISTS humanization_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  pattern_type text NOT NULL CHECK (pattern_type IN ('transition', 'connector', 'expression', 'emoji')),
  pattern_text text NOT NULL,
  usage_frequency decimal DEFAULT 0.0, -- Fréquence d'utilisation (0-1)

  created_at timestamptz DEFAULT now(),

  CONSTRAINT unique_pattern UNIQUE (pattern_type, pattern_text)
);

-- Insérer patterns initiaux
INSERT INTO humanization_patterns (pattern_type, pattern_text, usage_frequency) VALUES
  ('transition', 'En fait,', 0.3),
  ('transition', 'D''ailleurs,', 0.3),
  ('transition', 'Notamment,', 0.3),
  ('transition', 'Par exemple,', 0.4),
  ('transition', 'En effet,', 0.3),
  ('transition', 'Cependant,', 0.3),
  ('transition', 'Toutefois,', 0.2),
  ('transition', 'Néanmoins,', 0.2),
  ('connector', 'qui permet de', 0.4),
  ('connector', 'ce qui signifie que', 0.4),
  ('connector', 'dans le but de', 0.3),
  ('connector', 'afin de', 0.4),
  ('expression', 'il faut savoir que', 0.3),
  ('expression', 'sachez que', 0.3),
  ('expression', 'notez bien que', 0.3),
  ('expression', 'gardez à l''esprit que', 0.2),
  ('emoji', '✅', 0.3),
  ('emoji', '📝', 0.3),
  ('emoji', '💡', 0.3),
  ('emoji', '⚠️', 0.2),
  ('emoji', '👉', 0.3)
ON CONFLICT (pattern_type, pattern_text) DO NOTHING;

-- ============================================================================
-- TABLE: content_generation_history
-- Historique complet avec métriques
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_generation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  schedule_id uuid REFERENCES content_automation_schedule(id),

  -- Contenu généré
  content_type text NOT NULL CHECK (content_type IN ('blog', 'city', 'faq')),
  content_id uuid,

  -- Métriques
  word_count integer,
  generation_time_seconds integer,
  naturalness_score integer,
  seo_score integer,

  -- Détection IA
  ai_detection_score decimal, -- 0-1 (0 = humain, 1 = IA détectée)

  -- Indexation
  submitted_to_google_at timestamptz,
  indexed_by_google_at timestamptz,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_schedule ON content_generation_history(schedule_id);
CREATE INDEX IF NOT EXISTS idx_history_content ON content_generation_history(content_type, content_id);

-- ============================================================================
-- TABLE: seo_indexation_tracking
-- Suivi précis de l'indexation Google
-- ============================================================================
CREATE TABLE IF NOT EXISTS seo_indexation_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- URL trackée
  url text NOT NULL UNIQUE,
  page_type text NOT NULL CHECK (page_type IN ('blog', 'city', 'faq', 'offer', 'other')),

  -- Statut indexation
  indexed boolean DEFAULT false,
  last_check_at timestamptz,
  first_indexed_at timestamptz,

  -- Problèmes détectés
  indexation_issues jsonb DEFAULT '[]'::jsonb,

  -- Métriques
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  average_position decimal,

  -- Actions
  submitted_via_api boolean DEFAULT false,
  submitted_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_url ON seo_indexation_tracking(url);
CREATE INDEX IF NOT EXISTS idx_tracking_indexed ON seo_indexation_tracking(indexed);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE content_automation_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE humanization_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_indexation_tracking ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour patterns (utilisés par le générateur)
CREATE POLICY "Anyone can read humanization patterns"
  ON humanization_patterns FOR SELECT
  TO public
  USING (true);

-- Admin uniquement pour le reste
CREATE POLICY "Service role full access schedule"
  ON content_automation_schedule FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access history"
  ON content_generation_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access tracking"
  ON seo_indexation_tracking FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FONCTIONS
-- ============================================================================

-- Fonction : Planifier le prochain contenu
CREATE OR REPLACE FUNCTION schedule_next_content(
  p_keyword text,
  p_city text,
  p_secondary_keywords text[] DEFAULT NULL,
  p_last_publish timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_scheduled_at timestamptz;
  v_schedule_id uuid;
  v_style_index integer;
  v_word_count integer;
BEGIN
  -- Calculer le prochain timestamp naturel
  IF p_last_publish IS NULL THEN
    -- Premier contenu : aujourd'hui entre 6h-23h
    v_scheduled_at := date_trunc('day', now()) +
                      interval '6 hours' +
                      (random() * interval '17 hours');
  ELSE
    -- Prochain contenu : 2-8h après le dernier
    v_scheduled_at := p_last_publish +
                      interval '2 hours' +
                      (random() * interval '6 hours');

    -- S'assurer que c'est entre 6h-23h
    IF extract(hour from v_scheduled_at) < 6 THEN
      v_scheduled_at := date_trunc('day', v_scheduled_at + interval '1 day') +
                        interval '6 hours' +
                        (random() * interval '4 hours');
    ELSIF extract(hour from v_scheduled_at) > 23 THEN
      v_scheduled_at := date_trunc('day', v_scheduled_at + interval '1 day') +
                        interval '6 hours' +
                        (random() * interval '4 hours');
    END IF;
  END IF;

  -- Variabilité aléatoire
  v_style_index := floor(random() * 5)::integer; -- 0-4 (5 styles)
  v_word_count := 1800 + floor(random() * 700)::integer; -- 1800-2500

  -- Insérer le schedule
  INSERT INTO content_automation_schedule (
    keyword,
    city,
    secondary_keywords,
    scheduled_at,
    variability_config
  ) VALUES (
    p_keyword,
    p_city,
    p_secondary_keywords,
    v_scheduled_at,
    jsonb_build_object(
      'styleIndex', v_style_index,
      'addTransitions', random() > 0.3,
      'addEmojis', random() > 0.6,
      'targetWordCount', v_word_count,
      'errorRate', random() * 0.05
    )
  )
  RETURNING id INTO v_schedule_id;

  RETURN v_schedule_id;
END;
$$;

-- Fonction : Récupérer le prochain contenu à générer
CREATE OR REPLACE FUNCTION get_next_scheduled_content()
RETURNS TABLE (
  id uuid,
  keyword text,
  city text,
  secondary_keywords text[],
  variability_config jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.keyword,
    s.city,
    s.secondary_keywords,
    s.variability_config
  FROM content_automation_schedule s
  WHERE s.status = 'pending'
    AND s.scheduled_at <= now()
  ORDER BY s.scheduled_at ASC
  LIMIT 1;
END;
$$;

-- Fonction : Marquer contenu comme publié
CREATE OR REPLACE FUNCTION mark_content_published(
  p_schedule_id uuid,
  p_blog_post_id uuid,
  p_city_page_id uuid DEFAULT NULL,
  p_faq_count integer DEFAULT 0,
  p_naturalness_score integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE content_automation_schedule
  SET
    status = 'published',
    published_at = now(),
    blog_post_id = p_blog_post_id,
    city_page_id = p_city_page_id,
    faq_count = p_faq_count,
    naturalness_score = p_naturalness_score,
    updated_at = now()
  WHERE id = p_schedule_id;

  RETURN FOUND;
END;
$$;

-- Fonction : Soumettre URL à Google pour indexation
CREATE OR REPLACE FUNCTION track_url_for_indexation(
  p_url text,
  p_page_type text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_tracking_id uuid;
BEGIN
  INSERT INTO seo_indexation_tracking (url, page_type)
  VALUES (p_url, p_page_type)
  ON CONFLICT (url)
  DO UPDATE SET updated_at = now()
  RETURNING id INTO v_tracking_id;

  RETURN v_tracking_id;
END;
$$;

-- ============================================================================
-- EXEMPLES D'UTILISATION
-- ============================================================================

-- Planifier 10 contenus automatiquement
/*
DO $$
DECLARE
  v_cities text[] := ARRAY['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice',
                           'Bordeaux', 'Lille', 'Nantes', 'Strasbourg', 'Montpellier'];
  v_keywords text[] := ARRAY['assurance taxi pas cher', 'assurance taxi jeune conducteur',
                             'assurance taxi professionnel', 'RC pro taxi obligatoire'];
  v_city text;
  v_keyword text;
  v_last_publish timestamptz := now();
BEGIN
  FOR v_city IN SELECT unnest(v_cities) LOOP
    v_keyword := v_keywords[floor(random() * array_length(v_keywords, 1) + 1)];

    PERFORM schedule_next_content(
      v_keyword,
      v_city,
      ARRAY['devis gratuit', 'courtier ORIAS'],
      v_last_publish
    );

    -- Mettre à jour pour le prochain
    v_last_publish := v_last_publish + interval '4 hours';
  END LOOP;
END $$;
*/
