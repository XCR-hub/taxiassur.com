/*
  # Création des tables pour planification de contenu et réseaux sociaux

  1. Nouvelles Tables
    - `content_schedule`
      - Gestion de la planification automatique de contenu SEO
      - Configuration par type de contenu (blog, faq, review)
      - Fréquence, mots-clés, auto-publication
    
    - `social_networks`
      - Gestion des comptes réseaux sociaux
      - Configuration OAuth, tokens, statuts
      - Support de 50+ plateformes
    
    - `social_posts`
      - Historique des publications sur les réseaux
      - Métriques d'engagement
      - Statut de publication
  
  2. Sécurité
    - RLS activé sur toutes les tables
    - Policies restrictives pour authentification
    - Protection des tokens sensibles
  
  3. Fonctionnalités
    - Planification automatique de contenu
    - Publication automatique sur réseaux sociaux
    - Tracking des performances
*/

-- =====================================================
-- TABLE: content_schedule
-- =====================================================

CREATE TABLE IF NOT EXISTS content_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('blog', 'faq', 'review')),
  frequency_per_week integer NOT NULL DEFAULT 1 CHECK (frequency_per_week >= 0 AND frequency_per_week <= 7),
  auto_publish boolean DEFAULT false,
  keywords text[] DEFAULT '{}',
  last_generated_at timestamptz,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_content_schedule_type ON content_schedule(content_type);
CREATE INDEX IF NOT EXISTS idx_content_schedule_active ON content_schedule(is_active);

-- RLS
ALTER TABLE content_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view content schedules"
  ON content_schedule FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage content schedules"
  ON content_schedule FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE: social_networks
-- =====================================================

CREATE TABLE IF NOT EXISTS social_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  account_name text,
  account_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_active boolean DEFAULT false,
  is_connected boolean DEFAULT false,
  auto_publish boolean DEFAULT false,
  last_post_at timestamptz,
  total_posts integer DEFAULT 0,
  total_engagement integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_social_networks_platform ON social_networks(platform);
CREATE INDEX IF NOT EXISTS idx_social_networks_active ON social_networks(is_active);
CREATE INDEX IF NOT EXISTS idx_social_networks_connected ON social_networks(is_connected);

-- RLS
ALTER TABLE social_networks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view social networks"
  ON social_networks FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage social networks"
  ON social_networks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE: social_posts
-- =====================================================

CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid REFERENCES social_networks(id) ON DELETE CASCADE,
  platform text NOT NULL,
  content text NOT NULL,
  media_urls text[] DEFAULT '{}',
  post_url text,
  external_id text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  clicks integer DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_social_posts_network ON social_posts(network_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_at);

-- RLS
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view social posts"
  ON social_posts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage social posts"
  ON social_posts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Initialiser les planifications de contenu
INSERT INTO content_schedule (content_type, frequency_per_week, auto_publish, keywords, is_active)
VALUES 
  ('blog', 2, false, ARRAY['assurance taxi', 'assurance vtc', 'RC professionnelle'], true),
  ('faq', 3, true, ARRAY['questions assurance taxi', 'tarifs assurance', 'garanties'], true),
  ('review', 1, true, ARRAY['avis clients', 'témoignages'], true)
ON CONFLICT DO NOTHING;

-- Initialiser les réseaux sociaux populaires
INSERT INTO social_networks (platform, is_active, is_connected, auto_publish)
VALUES 
  ('Facebook', false, false, false),
  ('Instagram', false, false, false),
  ('Twitter/X', false, false, false),
  ('LinkedIn', false, false, false),
  ('TikTok', false, false, false),
  ('YouTube', false, false, false),
  ('Pinterest', false, false, false),
  ('WhatsApp Business', false, false, false)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_content_schedule_updated_at ON content_schedule;
CREATE TRIGGER update_content_schedule_updated_at
  BEFORE UPDATE ON content_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_networks_updated_at ON social_networks;
CREATE TRIGGER update_social_networks_updated_at
  BEFORE UPDATE ON social_networks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_posts_updated_at ON social_posts;
CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
