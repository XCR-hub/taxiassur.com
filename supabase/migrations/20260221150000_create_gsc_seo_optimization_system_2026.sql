/*
  # Système d'Optimisation SEO Google Search Console - 21 Février 2026

  ## Tables Créées
  
  1. **gsc_queries** - Requêtes Google Search Console
     - Stocke toutes les requêtes avec métriques (impressions, clics, CTR, position)
     - Historique temporel pour suivre l'évolution
  
  2. **gsc_pages** - Performance des pages
     - Métriques par URL
     - Identifie les pages à optimiser
  
  3. **seo_opportunities** - Opportunités SEO détectées
     - Analyse automatique des requêtes à fort potentiel
     - Score de priorité
  
  4. **seo_content_improvements** - Améliorations de contenu
     - Suggestions générées par IA
     - Suivi des optimisations appliquées
  
  5. **ai_content_prompts** - Prompts IA enrichis
     - Templates de génération de contenu optimisés SEO
     - Intégration des requêtes GSC

  ## Sécurité
  - RLS activé sur toutes les tables
  - Accès admin uniquement pour modifications
*/

-- Table des requêtes Google Search Console
CREATE TABLE IF NOT EXISTS gsc_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  ctr decimal(5,4) DEFAULT 0,
  position decimal(5,2) DEFAULT 0,
  country text DEFAULT 'fra',
  device text DEFAULT 'ALL',
  date date NOT NULL,
  page_url text,
  opportunity_score integer DEFAULT 0,
  is_tracked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(query, date, device, country)
);

-- Table des pages avec performance
CREATE TABLE IF NOT EXISTS gsc_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  ctr decimal(5,4) DEFAULT 0,
  position decimal(5,2) DEFAULT 0,
  date date NOT NULL,
  needs_optimization boolean DEFAULT false,
  optimization_priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(url, date)
);

-- Table des opportunités SEO
CREATE TABLE IF NOT EXISTS seo_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  opportunity_type text NOT NULL, -- 'high_impression_low_ctr', 'position_5_15', 'trending_up', 'new_query'
  current_position decimal(5,2),
  impressions integer,
  clicks integer,
  ctr decimal(5,4),
  potential_clicks integer, -- Estimation si CTR amélioré
  priority_score integer DEFAULT 0,
  suggested_actions jsonb DEFAULT '[]',
  status text DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'ignored'
  assigned_to uuid REFERENCES admin_users(id),
  target_url text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'
);

-- Table des améliorations de contenu
CREATE TABLE IF NOT EXISTS seo_content_improvements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES seo_opportunities(id),
  query text NOT NULL,
  current_url text,
  improvement_type text NOT NULL, -- 'new_page', 'optimize_existing', 'add_section', 'improve_title', 'improve_meta'
  current_content text,
  suggested_content text,
  ai_prompt_used text,
  ai_model text DEFAULT 'gpt-4',
  status text DEFAULT 'draft', -- 'draft', 'review', 'approved', 'published'
  created_by uuid REFERENCES admin_users(id),
  reviewed_by uuid REFERENCES admin_users(id),
  published_at timestamptz,
  performance_before jsonb,
  performance_after jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des prompts IA enrichis
CREATE TABLE IF NOT EXISTS ai_content_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL, -- 'blog', 'city_page', 'faq', 'product', 'news'
  base_prompt text NOT NULL,
  seo_enhancement text, -- Enrichissement basé sur GSC
  target_queries text[], -- Requêtes ciblées
  variables jsonb DEFAULT '{}', -- Variables dynamiques
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  avg_performance_score decimal(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table historique des synchronisations GSC
CREATE TABLE IF NOT EXISTS gsc_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_date timestamptz DEFAULT now(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  queries_imported integer DEFAULT 0,
  pages_imported integer DEFAULT 0,
  opportunities_detected integer DEFAULT 0,
  status text DEFAULT 'success', -- 'success', 'partial', 'failed'
  error_message text,
  duration_ms integer,
  metadata jsonb DEFAULT '{}'
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_gsc_queries_query ON gsc_queries(query);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_date ON gsc_queries(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_impressions ON gsc_queries(impressions DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_opportunity_score ON gsc_queries(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_tracked ON gsc_queries(is_tracked) WHERE is_tracked = true;

CREATE INDEX IF NOT EXISTS idx_gsc_pages_url ON gsc_pages(url);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_date ON gsc_pages(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_needs_optimization ON gsc_pages(needs_optimization) WHERE needs_optimization = true;

CREATE INDEX IF NOT EXISTS idx_seo_opportunities_status ON seo_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_seo_opportunities_priority ON seo_opportunities(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_seo_opportunities_query ON seo_opportunities(query);

CREATE INDEX IF NOT EXISTS idx_seo_content_status ON seo_content_improvements(status);

-- Fonction de calcul du score d'opportunité
CREATE OR REPLACE FUNCTION calculate_opportunity_score(
  p_impressions integer,
  p_clicks integer,
  p_ctr decimal,
  p_position decimal
) RETURNS integer AS $$
DECLARE
  v_score integer := 0;
BEGIN
  -- Score basé sur les impressions (max 40 points)
  v_score := v_score + LEAST(40, (p_impressions / 25)::integer);
  
  -- Bonus si position 5-15 (sweet spot) (20 points)
  IF p_position >= 5 AND p_position <= 15 THEN
    v_score := v_score + 20;
  END IF;
  
  -- Bonus si CTR faible malgré impressions élevées (20 points)
  IF p_impressions > 100 AND p_ctr < 0.05 THEN
    v_score := v_score + 20;
  END IF;
  
  -- Bonus si déjà quelques clics (potentiel de croissance) (20 points)
  IF p_clicks > 0 AND p_clicks < 50 THEN
    v_score := v_score + 20;
  END IF;
  
  RETURN LEAST(100, v_score);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction de détection automatique des opportunités
CREATE OR REPLACE FUNCTION detect_seo_opportunities()
RETURNS TABLE(
  query text,
  opportunity_type text,
  priority_score integer,
  current_position decimal,
  impressions integer,
  clicks integer,
  ctr decimal,
  potential_clicks integer
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_data AS (
    SELECT DISTINCT ON (q.query)
      q.query,
      q.impressions,
      q.clicks,
      q.ctr,
      q.position,
      q.date
    FROM gsc_queries q
    WHERE q.date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY q.query, q.date DESC
  ),
  scored_queries AS (
    SELECT
      ld.query,
      CASE
        WHEN ld.impressions > 500 AND ld.ctr < 0.05 THEN 'high_impression_low_ctr'
        WHEN ld.position >= 5 AND ld.position <= 15 AND ld.impressions > 100 THEN 'position_5_15'
        WHEN ld.impressions > 50 AND ld.clicks = 0 THEN 'zero_clicks'
        ELSE 'general'
      END as opp_type,
      calculate_opportunity_score(
        ld.impressions,
        ld.clicks,
        ld.ctr,
        ld.position
      ) as score,
      ld.position,
      ld.impressions,
      ld.clicks,
      ld.ctr,
      -- Estimation: si on atteint CTR de 10% (position top 3)
      ROUND(ld.impressions * 0.10)::integer as potential
    FROM latest_data ld
    WHERE ld.impressions > 50 -- Minimum viable
  )
  SELECT
    sq.query,
    sq.opp_type,
    sq.score,
    sq.position,
    sq.impressions,
    sq.clicks,
    sq.ctr,
    sq.potential
  FROM scored_queries sq
  WHERE sq.score >= 40 -- Seuil minimum
  ORDER BY sq.score DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer automatiquement les opportunités
CREATE OR REPLACE FUNCTION auto_create_opportunities()
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_opp record;
BEGIN
  FOR v_opp IN SELECT * FROM detect_seo_opportunities() LOOP
    INSERT INTO seo_opportunities (
      query,
      opportunity_type,
      current_position,
      impressions,
      clicks,
      ctr,
      potential_clicks,
      priority_score,
      status
    ) VALUES (
      v_opp.query,
      v_opp.opportunity_type,
      v_opp.current_position,
      v_opp.impressions,
      v_opp.clicks,
      v_opp.ctr,
      v_opp.potential_clicks,
      v_opp.priority_score,
      'pending'
    )
    ON CONFLICT DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les top requêtes par catégorie
CREATE OR REPLACE FUNCTION get_top_queries_by_category()
RETURNS TABLE(
  category text,
  query text,
  impressions integer,
  clicks integer,
  avg_position decimal
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_queries AS (
    SELECT DISTINCT ON (q.query)
      q.query,
      q.impressions,
      q.clicks,
      q.position
    FROM gsc_queries q
    WHERE q.date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY q.query, q.date DESC
  )
  SELECT
    CASE
      WHEN lq.query ILIKE '%prix%' OR lq.query ILIKE '%tarif%' OR lq.query ILIKE '%coût%' THEN 'prix'
      WHEN lq.query ILIKE '%paris%' OR lq.query ILIKE '%lyon%' OR lq.query ILIKE '%marseille%' THEN 'ville'
      WHEN lq.query ILIKE '%vtc%' THEN 'vtc'
      WHEN lq.query ILIKE '%professionnelle%' OR lq.query ILIKE '%pro%' THEN 'professionnel'
      WHEN lq.query ILIKE '%jeune%' THEN 'jeune_conducteur'
      WHEN lq.query ILIKE '%comparateur%' OR lq.query ILIKE '%comparatif%' THEN 'comparaison'
      ELSE 'general'
    END as category,
    lq.query,
    lq.impressions,
    lq.clicks,
    lq.position as avg_position
  FROM latest_queries lq
  WHERE lq.impressions > 10
  ORDER BY lq.impressions DESC;
END;
$$ LANGUAGE plpgsql;

-- Insérer les prompts IA de base enrichis SEO
INSERT INTO ai_content_prompts (name, category, base_prompt, seo_enhancement) VALUES
(
  'blog_article_seo',
  'blog',
  'Rédige un article de blog professionnel et informatif sur {topic} pour TaxiAssur',
  'Intègre naturellement ces requêtes SEO prioritaires : {target_queries}. Optimise pour les featured snippets. Structure avec H2/H3. Vise 1500-2000 mots.'
),
(
  'city_page_seo',
  'city_page',
  'Crée une page ville complète pour l''assurance taxi à {city}',
  'Cible ces requêtes locales : {target_queries}. Inclus données locales, tarifs moyens, spécificités réglementaires. Format FAQ structuré.'
),
(
  'faq_answer_seo',
  'faq',
  'Réponds de manière complète et professionnelle à la question : {question}',
  'Optimise pour la position 0 (featured snippet). Réponds directement en 2-3 phrases, puis développe. Cible : {target_queries}'
),
(
  'comparison_page_seo',
  'product',
  'Crée une page de comparaison : {comparison_topic}',
  'Structure en tableau comparatif. Cible : {target_queries}. Inclus prix, garanties, avantages/inconvénients. Conclusion avec CTA.'
),
(
  'news_article_seo',
  'news',
  'Rédige un article d''actualité professionnel sur : {news_topic}',
  'Angle assurance taxi/VTC. Intègre expertise métier. Cible : {target_queries}. Format journalistique avec sources.'
)
ON CONFLICT (name) DO UPDATE SET
  seo_enhancement = EXCLUDED.seo_enhancement,
  updated_at = now();

-- RLS Policies
ALTER TABLE gsc_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_sync_history ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout voir et modifier
CREATE POLICY "Admins full access gsc_queries" ON gsc_queries FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'commercial'))
);

CREATE POLICY "Admins full access gsc_pages" ON gsc_pages FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'commercial'))
);

CREATE POLICY "Admins full access seo_opportunities" ON seo_opportunities FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'commercial'))
);

CREATE POLICY "Admins full access seo_content_improvements" ON seo_content_improvements FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'commercial'))
);

CREATE POLICY "Admins full access ai_content_prompts" ON ai_content_prompts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'commercial'))
);

CREATE POLICY "Admins full access gsc_sync_history" ON gsc_sync_history FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'commercial'))
);

-- Lecture publique pour les prompts actifs (pour les edge functions)
CREATE POLICY "Public read active prompts" ON ai_content_prompts FOR SELECT TO anon, authenticated USING (is_active = true);
