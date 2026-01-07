/*
  # Fonctionnalités Avancées Tracking Emails

  1. Nouvelles Tables
    - `email_ab_tests` : Tests A/B sur les emails
    - `email_ab_variants` : Variantes de tests A/B
    - `email_geolocation` : Géolocalisation des ouvertures/clics
    - `lead_engagement_scores` : Scores d'engagement par lead
    - `email_templates_smart` : Templates intelligents adaptatifs
    - `email_notifications_config` : Configuration des alertes push

  2. Fonctionnalités
    - Géolocalisation via IP
    - A/B Testing automatique
    - Notifications push temps réel
    - Score d'engagement calculé automatiquement
    - Templates adaptatifs selon engagement
*/

-- Table pour les tests A/B
CREATE TABLE IF NOT EXISTS email_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  variant_a_subject text NOT NULL,
  variant_b_subject text NOT NULL,
  variant_a_content text NOT NULL,
  variant_b_content text NOT NULL,
  sample_size int DEFAULT 100,
  winner_variant text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'paused')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table pour les variantes envoyées
CREATE TABLE IF NOT EXISTS email_ab_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id uuid REFERENCES email_ab_tests(id) ON DELETE CASCADE,
  email_send_id uuid REFERENCES email_sends(id) ON DELETE CASCADE,
  variant text NOT NULL CHECK (variant IN ('A', 'B')),
  created_at timestamptz DEFAULT now()
);

-- Table géolocalisation
CREATE TABLE IF NOT EXISTS email_geolocation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id uuid REFERENCES email_sends(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('open', 'click')),
  ip_address text NOT NULL,
  country_code text,
  country_name text,
  city text,
  latitude decimal(10, 7),
  longitude decimal(10, 7),
  timezone text,
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Table scores d'engagement
CREATE TABLE IF NOT EXISTS lead_engagement_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  total_emails_sent int DEFAULT 0,
  total_emails_opened int DEFAULT 0,
  total_emails_clicked int DEFAULT 0,
  total_emails_replied int DEFAULT 0,
  open_rate decimal(5, 2) DEFAULT 0,
  click_rate decimal(5, 2) DEFAULT 0,
  reply_rate decimal(5, 2) DEFAULT 0,
  engagement_score int DEFAULT 0,
  last_interaction_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id)
);

-- Table templates intelligents
CREATE TABLE IF NOT EXISTS email_templates_smart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  engagement_level text NOT NULL CHECK (engagement_level IN ('low', 'medium', 'high')),
  subject_template text NOT NULL,
  content_template text NOT NULL,
  personalization_fields jsonb DEFAULT '{}',
  usage_count int DEFAULT 0,
  success_rate decimal(5, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table configuration notifications
CREATE TABLE IF NOT EXISTS email_notifications_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('vip_open', 'first_open', 'click', 'reply', 'engagement_drop')),
  enabled boolean DEFAULT true,
  conditions jsonb DEFAULT '{}',
  channels text[] DEFAULT ARRAY['email', 'push'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON email_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_variants_test ON email_ab_variants(ab_test_id);
CREATE INDEX IF NOT EXISTS idx_ab_variants_email ON email_ab_variants(email_send_id);
CREATE INDEX IF NOT EXISTS idx_geolocation_email ON email_geolocation(email_send_id);
CREATE INDEX IF NOT EXISTS idx_geolocation_country ON email_geolocation(country_code);
CREATE INDEX IF NOT EXISTS idx_engagement_lead ON lead_engagement_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_engagement_score ON lead_engagement_scores(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_templates_level ON email_templates_smart(engagement_level);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON email_notifications_config(user_id);

-- RLS
ALTER TABLE email_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_ab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_geolocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_engagement_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates_smart ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications_config ENABLE ROW LEVEL SECURITY;

-- Policies A/B Tests
CREATE POLICY "Admins can manage AB tests"
  ON email_ab_tests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Policies A/B Variants
CREATE POLICY "Admins can view AB variants"
  ON email_ab_variants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Service can insert AB variants"
  ON email_ab_variants FOR INSERT
  WITH CHECK (true);

-- Policies Géolocalisation
CREATE POLICY "Admins can view geolocation"
  ON email_geolocation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Service can insert geolocation"
  ON email_geolocation FOR INSERT
  WITH CHECK (true);

-- Policies Engagement Scores
CREATE POLICY "Admins can view engagement scores"
  ON lead_engagement_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Service can update engagement scores"
  ON lead_engagement_scores FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies Templates
CREATE POLICY "Admins can manage templates"
  ON email_templates_smart FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Policies Notifications Config
CREATE POLICY "Users can manage own notifications"
  ON email_notifications_config FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insérer des templates par défaut
INSERT INTO email_templates_smart (name, description, engagement_level, subject_template, content_template, personalization_fields) VALUES
(
  'Relance Faible Engagement',
  'Pour les leads peu engagés',
  'low',
  '{{name}}, une question rapide sur votre assurance taxi ?',
  '<p>Bonjour {{name}},</p><p>Je remarque que vous n''avez pas eu le temps de consulter nos offres.</p><p>Puis-je vous aider avec une question spécifique ?</p><p>Cordialement,<br>L''équipe TaxiAssur</p>',
  '{"name": "Nom du prospect"}'::jsonb
),
(
  'Engagement Moyen',
  'Pour les leads moyennement engagés',
  'medium',
  '{{name}}, votre devis personnalisé est prêt',
  '<p>Bonjour {{name}},</p><p>Suite à votre intérêt pour nos services, j''ai préparé un devis personnalisé pour vous.</p><p>Quand êtes-vous disponible pour en discuter ?</p><p>Cordialement,<br>L''équipe TaxiAssur</p>',
  '{"name": "Nom du prospect"}'::jsonb
),
(
  'Haute Engagement',
  'Pour les leads très engagés',
  'high',
  '{{name}}, finalisons ensemble votre souscription',
  '<p>Bonjour {{name}},</p><p>Je vois que vous êtes très intéressé par nos offres !</p><p>Je vous propose de finaliser votre souscription ensemble. Êtes-vous disponible demain ?</p><p>Cordialement,<br>L''équipe TaxiAssur</p>',
  '{"name": "Nom du prospect"}'::jsonb
)
ON CONFLICT DO NOTHING;
