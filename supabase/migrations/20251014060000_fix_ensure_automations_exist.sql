/*
  # Garantir que toutes les automatisations existent - VERSION CORRIGÉE

  1. Tables
    - Vérifier/créer automation_status
    - Utiliser la table social_networks existante

  2. Données
    - Insérer toutes les automatisations si elles n'existent pas
    - Mettre à jour les réseaux sociaux existants

  3. Sécurité
    - RLS policies pour authenticated users
*/

-- Créer la table automation_status si elle n'existe pas
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

-- Enable RLS on automation_status
ALTER TABLE automation_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to read automations" ON automation_status;
DROP POLICY IF EXISTS "Allow authenticated users to update automations" ON automation_status;
DROP POLICY IF EXISTS "Allow authenticated users to insert automations" ON automation_status;

-- Create policies for automation_status
CREATE POLICY "Allow authenticated users to read automations"
  ON automation_status
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update automations"
  ON automation_status
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert automations"
  ON automation_status
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert all automations if they don't exist
INSERT INTO automation_status (name, description, frequency, is_enabled)
VALUES
  ('ambassador_rewards', 'Calcul automatique récompenses ambassadeurs', 'daily', true),
  ('backlink_prospecting', 'Prospection automatique opportunités backlinks', 'daily', true),
  ('competitor_monitoring', 'Surveillance automatique concurrence', 'daily', true),
  ('ai_content_generation', 'Génération automatique contenu IA', 'daily', false),
  ('indexnow_submission', 'Soumission automatique IndexNow multi-moteurs', 'hourly', true),
  ('google_bing_ping', 'Ping automatique Google & Bing', 'daily', true),
  ('seo_metrics_update', 'Mise à jour métriques SEO toutes pages', 'hourly', true),
  ('lead_followup', 'Relance automatique leads non contactés', 'hourly', true),
  ('sitemap_regeneration', 'Régénération automatique du sitemap XML', 'daily', true),
  ('social_media_posting', 'Partage automatique sur réseaux sociaux', 'daily', false)
ON CONFLICT (name) DO NOTHING;

-- Ensure social_networks has the needed policies (table already exists from previous migration)
DROP POLICY IF EXISTS "Allow authenticated users to read social networks" ON social_networks;
DROP POLICY IF EXISTS "Allow authenticated users to update social networks" ON social_networks;
DROP POLICY IF EXISTS "Allow authenticated users to insert social networks" ON social_networks;

CREATE POLICY "Allow authenticated users to read social networks"
  ON social_networks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update social networks"
  ON social_networks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert social networks"
  ON social_networks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update or insert social networks with correct structure
INSERT INTO social_networks (name, category, url, is_active, posting_frequency)
VALUES
  ('facebook', 'social', 'https://facebook.com', false, 'daily'),
  ('twitter', 'social', 'https://twitter.com', false, 'daily'),
  ('linkedin', 'professional', 'https://linkedin.com', false, 'daily'),
  ('instagram', 'social', 'https://instagram.com', false, 'daily'),
  ('pinterest', 'social', 'https://pinterest.com', false, 'daily')
ON CONFLICT (name)
DO UPDATE SET
  is_active = EXCLUDED.is_active,
  posting_frequency = EXCLUDED.posting_frequency;

-- Create function to update updated_at (only for automation_status)
CREATE OR REPLACE FUNCTION update_automation_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_automation_status_updated_at ON automation_status;
CREATE TRIGGER update_automation_status_updated_at
  BEFORE UPDATE ON automation_status
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_status_timestamp();

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_automation_status_name ON automation_status(name);
CREATE INDEX IF NOT EXISTS idx_automation_status_enabled ON automation_status(is_enabled);
CREATE INDEX IF NOT EXISTS idx_social_networks_name ON social_networks(name);
CREATE INDEX IF NOT EXISTS idx_social_networks_active ON social_networks(is_active);
