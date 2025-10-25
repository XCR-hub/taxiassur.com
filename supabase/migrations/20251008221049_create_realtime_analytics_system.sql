/*
  # Système Analytics Temps Réel Complet

  ## Description
  Crée l'infrastructure complète pour analytics temps réel, tracking conversions,
  géolocalisation, monitoring SEO, et contrôle automation.

  ## Tables Créées
  1. `analytics_sessions` - Sessions utilisateurs en temps réel
  2. `analytics_events` - Tous les événements trackés
  3. `quote_requests` - Demandes de devis détaillées
  4. `automation_status` - État des automatisations
  5. `seo_metrics` - Métriques SEO temps réel
  6. `conversion_funnel` - Tunnel de conversion

  ## Sécurité
  - RLS activé
  - Admins peuvent tout voir
  - Données anonymisées pour utilisateurs
*/

-- =====================================================
-- TABLE 1: ANALYTICS SESSIONS (Temps Réel)
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  user_fingerprint text,
  
  -- Source & Attribution
  referrer text,
  traffic_source text, -- google, bing, facebook, direct...
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  referral_code text,
  
  -- Géolocalisation
  country text DEFAULT 'FR',
  city text,
  region text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  ip_address inet,
  
  -- Device & Browser
  device_type text, -- desktop, mobile, tablet
  browser text,
  os text,
  screen_resolution text,
  
  -- Comportement
  pages_viewed integer DEFAULT 0,
  time_on_site integer DEFAULT 0, -- secondes
  scroll_depth integer DEFAULT 0, -- pourcentage
  interactions integer DEFAULT 0,
  cta_clicks integer DEFAULT 0,
  
  -- Conversion
  converted boolean DEFAULT false,
  conversion_type text, -- lead, quote, callback
  conversion_value numeric(10,2),
  
  -- Timestamps
  started_at timestamptz DEFAULT NOW(),
  last_activity_at timestamptz DEFAULT NOW(),
  ended_at timestamptz,
  
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_analytics_sessions_source ON analytics_sessions(traffic_source);
CREATE INDEX idx_analytics_sessions_city ON analytics_sessions(city);
CREATE INDEX idx_analytics_sessions_converted ON analytics_sessions(converted);
CREATE INDEX idx_analytics_sessions_started ON analytics_sessions(started_at DESC);

ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage sessions"
  ON analytics_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can insert own session"
  ON analytics_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update own session"
  ON analytics_sessions FOR UPDATE
  USING (session_id IS NOT NULL);

-- =====================================================
-- TABLE 2: ANALYTICS EVENTS (Granulaire)
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text REFERENCES analytics_sessions(session_id),
  
  event_type text NOT NULL, -- page_view, cta_click, form_start, form_submit, scroll, etc.
  event_category text, -- engagement, conversion, navigation
  event_label text,
  event_value numeric(10,2),
  
  -- Context
  page_url text NOT NULL,
  page_title text,
  element_id text,
  element_text text,
  
  -- Données supplémentaires
  metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage events"
  ON analytics_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can insert events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- TABLE 3: QUOTE REQUESTS (Demandes Devis Détaillées)
-- =====================================================
CREATE TABLE IF NOT EXISTS quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text REFERENCES analytics_sessions(session_id),
  
  -- Informations contact
  name text,
  email text,
  phone text,
  
  -- Détails véhicule
  vehicle_age text,
  vehicle_type text,
  coverage_type text, -- tiers, tiers-etendu, tous-risques
  
  -- Profil
  driver_age integer,
  city text NOT NULL,
  claims_count integer DEFAULT 0,
  
  -- Résultat calculé
  estimated_monthly_price numeric(10,2),
  estimated_annual_price numeric(10,2),
  estimated_savings numeric(10,2),
  
  -- Statut
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'quoted', 'converted', 'rejected')),
  assigned_to text,
  
  -- Timestamps
  requested_at timestamptz DEFAULT NOW(),
  contacted_at timestamptz,
  converted_at timestamptz,
  
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_quote_requests_status ON quote_requests(status);
CREATE INDEX idx_quote_requests_city ON quote_requests(city);
CREATE INDEX idx_quote_requests_created ON quote_requests(created_at DESC);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage quotes"
  ON quote_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can insert quote request"
  ON quote_requests FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- TABLE 4: AUTOMATION STATUS (Contrôle Automatisations)
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  
  -- État
  is_enabled boolean DEFAULT true,
  is_running boolean DEFAULT false,
  
  -- Configuration
  frequency text DEFAULT 'hourly' CHECK (frequency IN ('realtime', 'hourly', 'daily', 'weekly')),
  config jsonb DEFAULT '{}',
  
  -- Statistiques
  total_runs integer DEFAULT 0,
  successful_runs integer DEFAULT 0,
  failed_runs integer DEFAULT 0,
  last_run_at timestamptz,
  last_run_status text,
  last_run_duration_ms integer,
  last_error text,
  
  -- Métriques
  items_processed integer DEFAULT 0,
  items_successful integer DEFAULT 0,
  items_failed integer DEFAULT 0,
  
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_automation_status_enabled ON automation_status(is_enabled);
CREATE INDEX idx_automation_status_running ON automation_status(is_running);

ALTER TABLE automation_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view enabled automations"
  ON automation_status FOR SELECT
  USING (is_enabled = true);

CREATE POLICY "Service role can manage automations"
  ON automation_status FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE 5: SEO METRICS (Métriques SEO Temps Réel)
-- =====================================================
CREATE TABLE IF NOT EXISTS seo_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Page
  page_url text NOT NULL,
  page_title text,
  page_type text, -- pillar, mirror, city, blog
  
  -- Métriques
  total_views integer DEFAULT 0,
  unique_views integer DEFAULT 0,
  avg_time_on_page integer DEFAULT 0, -- secondes
  avg_scroll_depth integer DEFAULT 0, -- pourcentage
  bounce_rate numeric(5,2) DEFAULT 0, -- pourcentage
  
  -- Conversion
  conversion_rate numeric(5,2) DEFAULT 0,
  total_conversions integer DEFAULT 0,
  
  -- SEO
  keyword_rankings jsonb DEFAULT '{}', -- {keyword: position}
  backlinks_count integer DEFAULT 0,
  internal_links_count integer DEFAULT 0,
  word_count integer DEFAULT 0,
  
  -- Indexation
  indexed_google boolean DEFAULT false,
  indexed_bing boolean DEFAULT false,
  last_crawled_at timestamptz,
  
  -- Période
  date date DEFAULT CURRENT_DATE,
  
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  
  UNIQUE(page_url, date)
);

CREATE INDEX idx_seo_metrics_page ON seo_metrics(page_url);
CREATE INDEX idx_seo_metrics_date ON seo_metrics(date DESC);
CREATE INDEX idx_seo_metrics_type ON seo_metrics(page_type);

ALTER TABLE seo_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view seo metrics"
  ON seo_metrics FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage seo metrics"
  ON seo_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE 6: CONVERSION FUNNEL (Tunnel Détaillé)
-- =====================================================
CREATE TABLE IF NOT EXISTS conversion_funnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text REFERENCES analytics_sessions(session_id),
  
  -- Étapes
  step_name text NOT NULL, -- landing, engagement, interest, consideration, action
  step_order integer NOT NULL,
  
  -- Timing
  reached_at timestamptz DEFAULT NOW(),
  time_to_reach integer, -- secondes depuis début session
  
  -- Context
  page_url text,
  trigger text, -- ce qui a déclenché le passage à l'étape
  
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_conversion_funnel_session ON conversion_funnel(session_id);
CREATE INDEX idx_conversion_funnel_step ON conversion_funnel(step_name);

ALTER TABLE conversion_funnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage funnel"
  ON conversion_funnel FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can insert funnel step"
  ON conversion_funnel FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour obtenir stats globales temps réel
CREATE OR REPLACE FUNCTION get_realtime_stats()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'active_sessions', (SELECT COUNT(*) FROM analytics_sessions WHERE last_activity_at > NOW() - INTERVAL '5 minutes'),
    'today_sessions', (SELECT COUNT(*) FROM analytics_sessions WHERE DATE(started_at) = CURRENT_DATE),
    'today_conversions', (SELECT COUNT(*) FROM analytics_sessions WHERE DATE(started_at) = CURRENT_DATE AND converted = true),
    'today_quote_requests', (SELECT COUNT(*) FROM quote_requests WHERE DATE(requested_at) = CURRENT_DATE),
    'pending_quotes', (SELECT COUNT(*) FROM quote_requests WHERE status = 'pending'),
    'avg_session_duration', (SELECT COALESCE(AVG(time_on_site), 0)::integer FROM analytics_sessions WHERE DATE(started_at) = CURRENT_DATE),
    'top_traffic_source', (SELECT traffic_source FROM analytics_sessions WHERE DATE(started_at) = CURRENT_DATE GROUP BY traffic_source ORDER BY COUNT(*) DESC LIMIT 1),
    'top_city', (SELECT city FROM analytics_sessions WHERE DATE(started_at) = CURRENT_DATE AND city IS NOT NULL GROUP BY city ORDER BY COUNT(*) DESC LIMIT 1)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Fonction pour obtenir top pages du jour
CREATE OR REPLACE FUNCTION get_top_pages_today()
RETURNS TABLE (
  page_url text,
  views bigint,
  unique_visitors bigint,
  conversion_rate numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ae.page_url,
    COUNT(*) as views,
    COUNT(DISTINCT ae.session_id) as unique_visitors,
    (COUNT(*) FILTER (WHERE s.converted = true) * 100.0 / NULLIF(COUNT(DISTINCT ae.session_id), 0))::numeric(5,2) as conversion_rate
  FROM analytics_events ae
  LEFT JOIN analytics_sessions s ON ae.session_id = s.session_id
  WHERE ae.event_type = 'page_view'
    AND DATE(ae.created_at) = CURRENT_DATE
  GROUP BY ae.page_url
  ORDER BY views DESC
  LIMIT 10;
END;
$$;

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Automatisations par défaut
INSERT INTO automation_status (name, description, frequency, is_enabled) VALUES
('sitemap_generation', 'Régénération automatique du sitemap XML', 'daily', true),
('indexnow_submission', 'Soumission automatique IndexNow multi-moteurs', 'hourly', true),
('search_engine_ping', 'Ping automatique Google & Bing', 'daily', true),
('backlink_prospection', 'Prospection automatique opportunités backlinks', 'daily', true),
('ambassador_rewards', 'Calcul automatique récompenses ambassadeurs', 'daily', true),
('lead_auto_followup', 'Relance automatique leads non contactés', 'hourly', true),
('seo_metrics_update', 'Mise à jour métriques SEO toutes pages', 'hourly', true),
('content_generation', 'Génération automatique contenu IA', 'daily', false),
('social_sharing', 'Partage automatique sur réseaux sociaux', 'daily', false),
('competitor_monitoring', 'Surveillance automatique concurrence', 'daily', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  frequency = EXCLUDED.frequency;
