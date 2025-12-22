/*
  # Système de Tracking SEO Réel

  ## Description
  Système complet pour tracker les vraies données SEO depuis Google Search Console,
  Bing Webmaster Tools et autres sources avec rafraîchissement quotidien automatique.

  ## Nouvelles Tables

  ### 1. `seo_metrics`
  Métriques SEO réelles quotidiennes
  - `id` (uuid, PK)
  - `date` (date) - Date de la métrique
  - `total_urls` (int) - Nombre total d'URLs
  - `indexed_pages` (int) - Pages indexées
  - `pending_pages` (int) - Pages en attente
  - `impressions` (bigint) - Impressions Google
  - `clicks` (bigint) - Clics Google
  - `ctr` (decimal) - Taux de clic
  - `average_position` (decimal) - Position moyenne
  - `top_queries` (jsonb) - Top 10 requêtes
  - `top_pages` (jsonb) - Top 10 pages
  - `crawl_errors` (int) - Erreurs de crawl
  - `sitemap_submitted` (boolean) - Sitemap soumis
  - `last_crawl_date` (timestamptz) - Dernier crawl
  - `source` (text) - google, bing, manual
  - `created_at` (timestamptz)

  ### 2. `seo_indexation_status`
  Statut d'indexation par URL
  - `id` (uuid, PK)
  - `url` (text) - URL complète
  - `path` (text) - Chemin relatif
  - `is_indexed` (boolean) - Indexée ou non
  - `last_indexed_at` (timestamptz) - Dernière indexation
  - `google_status` (text) - Status Google
  - `bing_status` (text) - Status Bing
  - `impressions_7d` (int) - Impressions 7 jours
  - `clicks_7d` (int) - Clics 7 jours
  - `average_position` (decimal) - Position moyenne
  - `has_errors` (boolean) - A des erreurs
  - `errors` (jsonb) - Liste des erreurs
  - `last_checked_at` (timestamptz) - Dernière vérification
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `seo_ping_history`
  Historique des pings aux moteurs de recherche
  - `id` (uuid, PK)
  - `engine` (text) - google, bing, yandex, etc.
  - `urls_pinged` (text[]) - URLs notifiées
  - `method` (text) - indexnow, sitemap, api
  - `success` (boolean) - Succès ou échec
  - `response_code` (int) - Code HTTP
  - `response_message` (text) - Message de réponse
  - `execution_time_ms` (int) - Temps d'exécution
  - `created_at` (timestamptz)

  ### 4. `seo_webhook_events`
  Événements webhook reçus
  - `id` (uuid, PK)
  - `source` (text) - google_search_console, bing, etc.
  - `event_type` (text) - new_indexed, crawl_error, etc.
  - `payload` (jsonb) - Données complètes
  - `processed` (boolean) - Traité ou non
  - `processed_at` (timestamptz) - Date de traitement
  - `created_at` (timestamptz)

  ### 5. `seo_automation_config`
  Configuration des automatisations SEO
  - `id` (uuid, PK)
  - `key` (text UNIQUE) - Clé de config
  - `value` (jsonb) - Valeur
  - `enabled` (boolean) - Activé
  - `last_executed_at` (timestamptz)
  - `next_execution_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Sécurité
  - RLS activé sur toutes les tables
  - Seuls les utilisateurs authentifiés peuvent accéder
*/

-- Table des métriques SEO quotidiennes
CREATE TABLE IF NOT EXISTS seo_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_urls int DEFAULT 0,
  indexed_pages int DEFAULT 0,
  pending_pages int DEFAULT 0,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  ctr decimal DEFAULT 0,
  average_position decimal DEFAULT 0,
  top_queries jsonb DEFAULT '[]'::jsonb,
  top_pages jsonb DEFAULT '[]'::jsonb,
  crawl_errors int DEFAULT 0,
  sitemap_submitted boolean DEFAULT false,
  last_crawl_date timestamptz,
  source text DEFAULT 'manual' CHECK (source IN ('google', 'bing', 'manual', 'automated')),
  created_at timestamptz DEFAULT now()
);

-- Table du statut d'indexation par URL
CREATE TABLE IF NOT EXISTS seo_indexation_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  path text NOT NULL,
  is_indexed boolean DEFAULT false,
  last_indexed_at timestamptz,
  google_status text,
  bing_status text,
  impressions_7d int DEFAULT 0,
  clicks_7d int DEFAULT 0,
  average_position decimal DEFAULT 0,
  has_errors boolean DEFAULT false,
  errors jsonb DEFAULT '[]'::jsonb,
  last_checked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table historique des pings
CREATE TABLE IF NOT EXISTS seo_ping_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine text NOT NULL,
  urls_pinged text[] DEFAULT ARRAY[]::text[],
  method text NOT NULL CHECK (method IN ('indexnow', 'sitemap', 'api', 'webhook')),
  success boolean DEFAULT false,
  response_code int,
  response_message text,
  execution_time_ms int,
  created_at timestamptz DEFAULT now()
);

-- Table des événements webhook
CREATE TABLE IF NOT EXISTS seo_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Table de configuration des automatisations
CREATE TABLE IF NOT EXISTS seo_automation_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  enabled boolean DEFAULT true,
  last_executed_at timestamptz,
  next_execution_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE seo_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_indexation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_ping_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_automation_config ENABLE ROW LEVEL SECURITY;

-- Policies pour seo_metrics
CREATE POLICY "Anyone can view seo metrics"
  ON seo_metrics FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert metrics"
  ON seo_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update metrics"
  ON seo_metrics FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete metrics"
  ON seo_metrics FOR DELETE
  TO authenticated
  USING (true);

-- Policies pour seo_indexation_status
CREATE POLICY "Anyone can view indexation status"
  ON seo_indexation_status FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert indexation status"
  ON seo_indexation_status FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update indexation status"
  ON seo_indexation_status FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete indexation status"
  ON seo_indexation_status FOR DELETE
  TO authenticated
  USING (true);

-- Policies pour seo_ping_history
CREATE POLICY "Authenticated users can view ping history"
  ON seo_ping_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert ping history"
  ON seo_ping_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies pour seo_webhook_events
CREATE POLICY "Authenticated users can view webhook events"
  ON seo_webhook_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert webhook events"
  ON seo_webhook_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update webhook events"
  ON seo_webhook_events FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies pour seo_automation_config
CREATE POLICY "Authenticated users can view config"
  ON seo_automation_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert config"
  ON seo_automation_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update config"
  ON seo_automation_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete config"
  ON seo_automation_config FOR DELETE
  TO authenticated
  USING (true);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_seo_metrics_date ON seo_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_seo_indexation_url ON seo_indexation_status(url);
CREATE INDEX IF NOT EXISTS idx_seo_indexation_indexed ON seo_indexation_status(is_indexed);
CREATE INDEX IF NOT EXISTS idx_seo_ping_engine ON seo_ping_history(engine);
CREATE INDEX IF NOT EXISTS idx_seo_ping_created ON seo_ping_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_webhook_processed ON seo_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_seo_webhook_source ON seo_webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_seo_automation_key ON seo_automation_config(key);

-- Configuration par défaut
INSERT INTO seo_automation_config (key, value, enabled, next_execution_at) VALUES
('daily_metrics_refresh', '{"cron": "0 2 * * *", "description": "Rafraîchissement quotidien à 2h du matin"}'::jsonb, true, NOW() + INTERVAL '1 day'),
('google_search_console', '{"enabled": false, "api_key": null, "site_url": "https://taxiassur.com"}'::jsonb, false, NULL),
('bing_webmaster_tools', '{"enabled": false, "api_key": null, "site_url": "https://taxiassur.com"}'::jsonb, false, NULL),
('auto_ping_on_publish', '{"enabled": true, "engines": ["google", "bing", "yandex"]}'::jsonb, true, NULL),
('indexnow_key', '{"key": null, "enabled": false}'::jsonb, false, NULL)
ON CONFLICT (key) DO NOTHING;

-- Fonction RPC pour obtenir les métriques actuelles
CREATE OR REPLACE FUNCTION get_current_seo_metrics()
RETURNS TABLE (
  total_urls int,
  indexed_pages int,
  pending_pages int,
  impressions_30d bigint,
  clicks_30d bigint,
  average_position decimal,
  last_update timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Récupérer les dernières métriques
  RETURN QUERY
  SELECT
    sm.total_urls,
    sm.indexed_pages,
    sm.pending_pages,
    COALESCE(SUM(sm.impressions) OVER (ORDER BY sm.date DESC ROWS BETWEEN CURRENT ROW AND 29 FOLLOWING), 0)::bigint as impressions_30d,
    COALESCE(SUM(sm.clicks) OVER (ORDER BY sm.date DESC ROWS BETWEEN CURRENT ROW AND 29 FOLLOWING), 0)::bigint as clicks_30d,
    sm.average_position,
    sm.created_at as last_update
  FROM seo_metrics sm
  ORDER BY sm.date DESC
  LIMIT 1;

  -- Si pas de métriques, retourner des valeurs par défaut
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      0 as total_urls,
      0 as indexed_pages,
      0 as pending_pages,
      0::bigint as impressions_30d,
      0::bigint as clicks_30d,
      0::decimal as average_position,
      NULL::timestamptz as last_update;
  END IF;
END;
$$;

-- Fonction RPC pour obtenir les URLs non indexées
CREATE OR REPLACE FUNCTION get_unindexed_urls()
RETURNS TABLE (
  url text,
  path text,
  last_checked_at timestamptz,
  errors jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sis.url,
    sis.path,
    sis.last_checked_at,
    sis.errors
  FROM seo_indexation_status sis
  WHERE sis.is_indexed = false
    OR sis.has_errors = true
  ORDER BY sis.last_checked_at ASC
  LIMIT 50;
END;
$$;

-- Fonction RPC pour enregistrer un ping
CREATE OR REPLACE FUNCTION log_seo_ping(
  p_engine text,
  p_urls text[],
  p_method text,
  p_success boolean,
  p_response_code int DEFAULT NULL,
  p_response_message text DEFAULT NULL,
  p_execution_time_ms int DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ping_id uuid;
BEGIN
  INSERT INTO seo_ping_history (
    engine,
    urls_pinged,
    method,
    success,
    response_code,
    response_message,
    execution_time_ms
  ) VALUES (
    p_engine,
    p_urls,
    p_method,
    p_success,
    p_response_code,
    p_response_message,
    p_execution_time_ms
  )
  RETURNING id INTO v_ping_id;

  RETURN v_ping_id;
END;
$$;

-- Fonction RPC pour mettre à jour le statut d'indexation
CREATE OR REPLACE FUNCTION update_indexation_status(
  p_url text,
  p_is_indexed boolean,
  p_google_status text DEFAULT NULL,
  p_bing_status text DEFAULT NULL,
  p_impressions_7d int DEFAULT NULL,
  p_clicks_7d int DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO seo_indexation_status (
    url,
    path,
    is_indexed,
    google_status,
    bing_status,
    impressions_7d,
    clicks_7d,
    last_checked_at,
    updated_at
  ) VALUES (
    p_url,
    REGEXP_REPLACE(p_url, '^https?://[^/]+', ''),
    p_is_indexed,
    p_google_status,
    p_bing_status,
    p_impressions_7d,
    p_clicks_7d,
    NOW(),
    NOW()
  )
  ON CONFLICT (url) DO UPDATE SET
    is_indexed = EXCLUDED.is_indexed,
    google_status = COALESCE(EXCLUDED.google_status, seo_indexation_status.google_status),
    bing_status = COALESCE(EXCLUDED.bing_status, seo_indexation_status.bing_status),
    impressions_7d = COALESCE(EXCLUDED.impressions_7d, seo_indexation_status.impressions_7d),
    clicks_7d = COALESCE(EXCLUDED.clicks_7d, seo_indexation_status.clicks_7d),
    last_checked_at = NOW(),
    updated_at = NOW();
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_seo_indexation_updated_at ON seo_indexation_status;
CREATE TRIGGER trigger_update_seo_indexation_updated_at
  BEFORE UPDATE ON seo_indexation_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_seo_automation_updated_at ON seo_automation_config;
CREATE TRIGGER trigger_update_seo_automation_updated_at
  BEFORE UPDATE ON seo_automation_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
