/*
  # Système d'optimisation leads et SEO auto-apprenant

  1. Nouvelles Tables
    - `gsc_performance_data` - Données Google Search Console
      - `id` (uuid, primary key)
      - `date` (date)
      - `query` (text) - Mot-clé
      - `clicks` (integer)
      - `impressions` (integer)
      - `ctr` (numeric)
      - `position` (numeric)
      - `created_at` (timestamptz)
      
    - `exit_intent_leads` - Leads capturés en exit intent
      - `id` (uuid, primary key)
      - `email` (text)
      - `phone` (text, nullable)
      - `session_id` (text)
      - `source_page` (text)
      - `created_at` (timestamptz)
      
    - `page_analytics` - Analytics des pages
      - `id` (uuid, primary key)
      - `page_url` (text)
      - `session_id` (text)
      - `user_agent` (text)
      - `referrer` (text, nullable)
      - `duration_seconds` (integer, nullable)
      - `created_at` (timestamptz)
      
    - `conversion_popups_tracking` - Tracking des pop-ups
      - `id` (uuid, primary key)
      - `popup_type` (text) - 'exit_intent', 'scroll', 'timer', 'inactivity'
      - `action` (text) - 'shown', 'closed', 'converted'
      - `session_id` (text)
      - `page_url` (text)
      - `created_at` (timestamptz)
      
    - `seo_content_performance` - Performance SEO du contenu
      - `id` (uuid, primary key)
      - `content_type` (text) - 'blog', 'city', 'faq'
      - `content_id` (text)
      - `url` (text)
      - `organic_traffic` (integer, default 0)
      - `conversions` (integer, default 0)
      - `avg_position` (numeric, nullable)
      - `last_updated` (timestamptz, default now())
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
    - Public read/insert for analytics tables (for frontend tracking)

  3. Indexes
    - Performance indexes on frequently queried columns
*/

-- Table GSC Performance Data
CREATE TABLE IF NOT EXISTS gsc_performance_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  query text NOT NULL,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  ctr numeric(5,4) DEFAULT 0,
  position numeric(5,2) DEFAULT 0,
  page_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gsc_date ON gsc_performance_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_query ON gsc_performance_data(query);
CREATE INDEX IF NOT EXISTS idx_gsc_clicks ON gsc_performance_data(clicks DESC);

-- Table Exit Intent Leads
CREATE TABLE IF NOT EXISTS exit_intent_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  session_id text,
  source_page text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exit_leads_email ON exit_intent_leads(email);
CREATE INDEX IF NOT EXISTS idx_exit_leads_created ON exit_intent_leads(created_at DESC);

-- Table Page Analytics
CREATE TABLE IF NOT EXISTS page_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url text NOT NULL,
  session_id text NOT NULL,
  user_agent text,
  referrer text,
  duration_seconds integer,
  viewport_width integer,
  viewport_height integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_page ON page_analytics(page_url);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON page_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON page_analytics(created_at DESC);

-- Table Conversion Popups Tracking
CREATE TABLE IF NOT EXISTS conversion_popups_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_type text NOT NULL,
  action text NOT NULL,
  session_id text NOT NULL,
  page_url text,
  converted_email text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_popups_type ON conversion_popups_tracking(popup_type);
CREATE INDEX IF NOT EXISTS idx_popups_action ON conversion_popups_tracking(action);
CREATE INDEX IF NOT EXISTS idx_popups_created ON conversion_popups_tracking(created_at DESC);

-- Table SEO Content Performance
CREATE TABLE IF NOT EXISTS seo_content_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id text NOT NULL,
  url text NOT NULL,
  organic_traffic integer DEFAULT 0,
  conversions integer DEFAULT 0,
  avg_position numeric(5,2),
  bounce_rate numeric(5,2),
  avg_time_on_page integer,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_content_unique ON seo_content_performance(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_seo_performance ON seo_content_performance(organic_traffic DESC, conversions DESC);

-- Enable RLS
ALTER TABLE gsc_performance_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_intent_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_popups_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_performance ENABLE ROW LEVEL SECURITY;

-- Policies pour gsc_performance_data
CREATE POLICY "Public can insert GSC data"
  ON gsc_performance_data FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read GSC data"
  ON gsc_performance_data FOR SELECT
  TO authenticated
  USING (true);

-- Policies pour exit_intent_leads
CREATE POLICY "Public can insert exit intent leads"
  ON exit_intent_leads FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read exit intent leads"
  ON exit_intent_leads FOR SELECT
  TO authenticated
  USING (true);

-- Policies pour page_analytics
CREATE POLICY "Public can insert page analytics"
  ON page_analytics FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read analytics"
  ON page_analytics FOR SELECT
  TO authenticated
  USING (true);

-- Policies pour conversion_popups_tracking
CREATE POLICY "Public can insert popup tracking"
  ON conversion_popups_tracking FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read popup tracking"
  ON conversion_popups_tracking FOR SELECT
  TO authenticated
  USING (true);

-- Policies pour seo_content_performance
CREATE POLICY "Public can read SEO performance"
  ON seo_content_performance FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can manage SEO performance"
  ON seo_content_performance FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function pour nettoyer les anciennes données analytics (>90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM page_analytics WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM conversion_popups_tracking WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron pour nettoyer les analytics chaque semaine
SELECT cron.schedule(
  'cleanup_analytics_weekly',
  '0 3 * * 0',
  $$SELECT cleanup_old_analytics();$$
);