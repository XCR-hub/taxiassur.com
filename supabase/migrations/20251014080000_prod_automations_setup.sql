/*
  # Configuration Automatisations - MODE PRODUCTION

  1. Tables
    - Création automation_status
    - Ajout contrainte UNIQUE sur social_networks.name

  2. Données
    - 10 automatisations (désactivées par défaut en prod)
    - Pas de données de démonstration

  3. Sécurité
    - RLS policies pour authenticated users
*/

-- Créer la table automation_status
CREATE TABLE IF NOT EXISTS automation_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  is_enabled boolean DEFAULT false,
  is_running boolean DEFAULT false,
  frequency text NOT NULL DEFAULT 'daily',
  total_runs integer DEFAULT 0,
  successful_runs integer DEFAULT 0,
  failed_runs integer DEFAULT 0,
  last_run_at timestamptz,
  last_run_status text,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE automation_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated users to read automations" ON automation_status;
DROP POLICY IF EXISTS "Allow authenticated users to update automations" ON automation_status;
DROP POLICY IF EXISTS "Allow authenticated users to insert automations" ON automation_status;

CREATE POLICY "Allow authenticated users to read automations"
  ON automation_status FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to update automations"
  ON automation_status FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert automations"
  ON automation_status FOR INSERT TO authenticated WITH CHECK (true);

-- Insert automations (désactivées par défaut en production)
INSERT INTO automation_status (name, description, frequency, is_enabled)
VALUES
  ('ambassador_rewards', 'Calcul automatique récompenses ambassadeurs', 'daily', false),
  ('backlink_prospecting', 'Prospection automatique opportunités backlinks', 'daily', false),
  ('competitor_monitoring', 'Surveillance automatique concurrence', 'daily', false),
  ('ai_content_generation', 'Génération automatique contenu IA', 'daily', false),
  ('indexnow_submission', 'Soumission automatique IndexNow multi-moteurs', 'hourly', false),
  ('google_bing_ping', 'Ping automatique Google & Bing', 'daily', false),
  ('seo_metrics_update', 'Mise à jour métriques SEO toutes pages', 'hourly', false),
  ('lead_followup', 'Relance automatique leads non contactés', 'hourly', false),
  ('sitemap_regeneration', 'Régénération automatique du sitemap XML', 'daily', false),
  ('social_media_posting', 'Partage automatique sur réseaux sociaux', 'daily', false)
ON CONFLICT (name) DO NOTHING;

-- Ajouter contrainte UNIQUE sur social_networks.name si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_networks_name_key'
    AND conrelid = 'social_networks'::regclass
  ) THEN
    ALTER TABLE social_networks ADD CONSTRAINT social_networks_name_key UNIQUE (name);
  END IF;
END $$;

-- RLS Policies pour social_networks
DROP POLICY IF EXISTS "Allow authenticated users to read social networks" ON social_networks;
DROP POLICY IF EXISTS "Allow authenticated users to update social networks" ON social_networks;
DROP POLICY IF EXISTS "Allow authenticated users to insert social networks" ON social_networks;

CREATE POLICY "Allow authenticated users to read social networks"
  ON social_networks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to update social networks"
  ON social_networks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert social networks"
  ON social_networks FOR INSERT TO authenticated WITH CHECK (true);

-- Insérer réseaux sociaux principaux (désactivés par défaut)
INSERT INTO social_networks (name, category, url, is_active, posting_frequency, domain_authority)
VALUES
  ('facebook', 'social', 'https://facebook.com', false, 'daily', 95),
  ('twitter', 'social', 'https://twitter.com', false, 'daily', 93),
  ('linkedin', 'professional', 'https://linkedin.com', false, 'daily', 98),
  ('instagram', 'social', 'https://instagram.com', false, 'daily', 94),
  ('pinterest', 'social', 'https://pinterest.com', false, 'daily', 85)
ON CONFLICT (name)
DO UPDATE SET
  is_active = EXCLUDED.is_active,
  posting_frequency = EXCLUDED.posting_frequency;

-- Fonction pour updated_at
CREATE OR REPLACE FUNCTION update_automation_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS update_automation_status_updated_at ON automation_status;
CREATE TRIGGER update_automation_status_updated_at
  BEFORE UPDATE ON automation_status
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_status_timestamp();

-- Index
CREATE INDEX IF NOT EXISTS idx_automation_status_name ON automation_status(name);
CREATE INDEX IF NOT EXISTS idx_automation_status_enabled ON automation_status(is_enabled);
CREATE INDEX IF NOT EXISTS idx_social_networks_name ON social_networks(name);
CREATE INDEX IF NOT EXISTS idx_social_networks_active ON social_networks(is_active);

-- Supprimer les fonctions existantes si elles existent
DROP FUNCTION IF EXISTS get_realtime_stats();
DROP FUNCTION IF EXISTS get_top_pages_today();

-- Fonction RPC pour stats temps réel (utilise vraies données uniquement)
CREATE FUNCTION get_realtime_stats()
RETURNS TABLE (
  active_sessions bigint,
  today_sessions bigint,
  today_conversions bigint,
  today_quote_requests bigint,
  pending_quotes bigint,
  avg_session_duration numeric,
  top_traffic_source text,
  top_city text
) AS $$
DECLARE
  v_active_sessions bigint;
  v_today_sessions bigint;
  v_today_conversions bigint;
  v_today_quote_requests bigint;
  v_pending_quotes bigint;
  v_avg_session_duration numeric;
  v_top_traffic_source text;
  v_top_city text;
BEGIN
  -- Vérifier si la table analytics_sessions existe
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_sessions') THEN
    -- Stats sessions
    SELECT
      COUNT(DISTINCT CASE WHEN last_activity_at > now() - interval '5 minutes' THEN id END),
      COUNT(DISTINCT CASE WHEN started_at >= date_trunc('day', now()) THEN id END),
      COUNT(DISTINCT CASE WHEN is_converted AND started_at >= date_trunc('day', now()) THEN id END),
      COALESCE(ROUND(AVG(CASE
        WHEN last_activity_at > started_at
        THEN EXTRACT(EPOCH FROM (last_activity_at - started_at)) / 60
        ELSE 0
      END), 1), 0)
    INTO v_active_sessions, v_today_sessions, v_today_conversions, v_avg_session_duration
    FROM analytics_sessions;

    -- Top source
    SELECT COALESCE(utm_source, 'Direct')
    INTO v_top_traffic_source
    FROM analytics_sessions
    WHERE started_at >= date_trunc('day', now())
      AND utm_source IS NOT NULL
    GROUP BY utm_source
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- Top city
    SELECT COALESCE(city, 'N/A')
    INTO v_top_city
    FROM analytics_sessions
    WHERE started_at >= date_trunc('day', now())
    GROUP BY city
    ORDER BY COUNT(*) DESC
    LIMIT 1;
  ELSE
    -- Si la table n'existe pas, valeurs par défaut
    v_active_sessions := 0;
    v_today_sessions := 0;
    v_today_conversions := 0;
    v_avg_session_duration := 0;
    v_top_traffic_source := 'Direct';
    v_top_city := 'N/A';
  END IF;

  -- Quote requests depuis analytics_events si la table existe
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
    SELECT COUNT(DISTINCT id)
    INTO v_today_quote_requests
    FROM analytics_events
    WHERE event_name = 'quote_request'
      AND created_at >= date_trunc('day', now());
  ELSE
    v_today_quote_requests := 0;
  END IF;

  -- Pending quotes depuis leads
  SELECT COUNT(*)
  INTO v_pending_quotes
  FROM leads
  WHERE status IN ('nouveau', 'contacte')
    AND created_at >= date_trunc('day', now());

  -- Retourner les résultats
  RETURN QUERY SELECT
    v_active_sessions,
    v_today_sessions,
    v_today_conversions,
    v_today_quote_requests,
    v_pending_quotes,
    v_avg_session_duration,
    COALESCE(v_top_traffic_source, 'Direct'),
    COALESCE(v_top_city, 'N/A');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_realtime_stats() TO authenticated;

-- Fonction pour top pages
CREATE FUNCTION get_top_pages_today()
RETURNS TABLE (
  page_url text,
  views bigint,
  unique_visitors bigint,
  conversion_rate numeric
) AS $$
BEGIN
  -- Vérifier si les tables existent
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_page_views')
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_sessions') THEN
    RETURN QUERY
    SELECT
      pv.page_url,
      COUNT(pv.id) as views,
      COUNT(DISTINCT pv.session_id) as unique_visitors,
      ROUND(
        (COUNT(DISTINCT CASE WHEN s.is_converted THEN s.id END)::numeric /
         NULLIF(COUNT(DISTINCT s.id), 0) * 100),
        1
      ) as conversion_rate
    FROM analytics_page_views pv
    JOIN analytics_sessions s ON s.id = pv.session_id
    WHERE pv.viewed_at >= date_trunc('day', now())
    GROUP BY pv.page_url
    ORDER BY views DESC
    LIMIT 10;
  ELSE
    -- Si les tables n'existent pas, retourner vide
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_top_pages_today() TO authenticated;
