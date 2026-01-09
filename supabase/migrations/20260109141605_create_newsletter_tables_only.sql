/*
  # Système de Newsletter Automatique - Tables

  1. Nouvelles Tables
    - `newsletter_subscribers` : Abonnés avec préférences
    - `newsletter_campaigns` : Campagnes d'emails automatiques
    - `newsletter_sends` : Historique d'envois
    - `newsletter_analytics` : Métriques de performance
  
  2. Sécurité
    - RLS activé sur toutes les tables
    - Tokens de désabonnement uniques
*/

-- Table des abonnés
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  
  -- Préférences
  frequency text DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  categories text[] DEFAULT ARRAY['assurance-taxi', 'actualites'],
  preferred_time time DEFAULT '09:00:00',
  
  -- Engagement
  total_opens int DEFAULT 0,
  total_clicks int DEFAULT 0,
  last_opened_at timestamptz,
  engagement_score int DEFAULT 50,
  
  -- Meta
  unsubscribe_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  source text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des campagnes
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contenu
  subject text NOT NULL,
  preview_text text,
  template text NOT NULL,
  articles jsonb DEFAULT '[]',
  
  -- Configuration
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  
  -- Segmentation
  target_categories text[],
  target_frequency text,
  min_engagement_score int DEFAULT 0,
  
  -- A/B Testing
  is_ab_test boolean DEFAULT false,
  variant_a_subject text,
  variant_b_subject text,
  winning_variant text,
  
  -- Stats
  recipients_count int DEFAULT 0,
  sent_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  open_count int DEFAULT 0,
  click_count int DEFAULT 0,
  unsubscribe_count int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des envois individuels
CREATE TABLE IF NOT EXISTS newsletter_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id uuid REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  
  -- Envoi
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  sent_at timestamptz,
  error_message text,
  
  -- A/B variant
  ab_variant text,
  
  -- Tracking
  opened_at timestamptz,
  clicked_at timestamptz,
  unsubscribed_at timestamptz,
  
  -- Personnalisation
  personalized_content jsonb,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(campaign_id, subscriber_id)
);

-- Table des analytics
CREATE TABLE IF NOT EXISTS newsletter_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  
  -- Métriques horaires
  hour timestamptz NOT NULL,
  opens int DEFAULT 0,
  clicks int DEFAULT 0,
  unsubscribes int DEFAULT 0,
  
  -- Engagement par device
  mobile_opens int DEFAULT 0,
  desktop_opens int DEFAULT 0,
  
  -- Top liens cliqués
  top_links jsonb DEFAULT '[]',
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(campaign_id, hour)
);

-- RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_analytics ENABLE ROW LEVEL SECURITY;

-- Policies pour subscribers (public peut s'inscrire)
CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscribers FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can view all subscribers"
  ON newsletter_subscribers FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can update subscribers"
  ON newsletter_subscribers FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Policies pour campaigns (admin only)
CREATE POLICY "Admins can manage campaigns"
  ON newsletter_campaigns FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Policies pour sends (admin only)
CREATE POLICY "Admins can view sends"
  ON newsletter_sends FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can insert sends"
  ON newsletter_sends FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can update sends"
  ON newsletter_sends FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Policies pour analytics (admin only)
CREATE POLICY "Admins can view analytics"
  ON newsletter_analytics FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "System can insert analytics"
  ON newsletter_analytics FOR INSERT
  TO authenticated
  WITH CHECK (true);
