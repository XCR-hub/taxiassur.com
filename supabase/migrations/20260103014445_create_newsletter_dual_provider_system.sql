/*
  # Système de Newsletter avec Dual Provider (Brevo + SendGrid)
  
  1. Tables créées
    - email_providers: Gestion de Brevo et SendGrid avec limites et compteurs
    - newsletter_subscribers: Abonnés newsletter avec statuts
    - newsletter_campaigns: Campagnes newsletter avec statistiques
    - email_templates_universal: Templates réutilisables cross-provider
    - ai_newsletter_content: Contenu généré par IA
    
  2. Fonctions PostgreSQL
    - select_optimal_email_provider(): Sélection intelligente du provider
    - increment_provider_counters(): Incrémentation des compteurs
    
  3. Security
    - RLS activé sur toutes les tables
    - Policies pour authenticated et anon users
*/

-- Table des providers d'email
CREATE TABLE IF NOT EXISTS email_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  daily_limit integer NOT NULL DEFAULT 300,
  monthly_limit integer NOT NULL DEFAULT 9000,
  current_daily_sent integer DEFAULT 0,
  current_monthly_sent integer DEFAULT 0,
  is_active boolean DEFAULT true,
  last_reset_daily date DEFAULT CURRENT_DATE,
  last_reset_monthly date DEFAULT CURRENT_DATE,
  api_key_set boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insérer Brevo et SendGrid
INSERT INTO email_providers (name, priority, daily_limit, monthly_limit, is_active)
VALUES 
  ('brevo', 1, 300, 9000, true),
  ('sendgrid', 2, 100, 3000, true)
ON CONFLICT (name) DO NOTHING;

-- Table des abonnés newsletter
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  source text DEFAULT 'website',
  status text DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained')),
  preferences jsonb DEFAULT '{"frequency": "weekly", "categories": ["assurance", "actualites"]}'::jsonb,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table des campagnes newsletter
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  content_html text NOT NULL,
  content_text text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'partial', 'failed')),
  provider_used text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  completed_at timestamptz,
  total_sent integer DEFAULT 0,
  total_delivered integer DEFAULT 0,
  total_opened integer DEFAULT 0,
  total_clicked integer DEFAULT 0,
  total_bounced integer DEFAULT 0,
  total_complained integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des templates universels
CREATE TABLE IF NOT EXISTS email_templates_universal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  subject_template text NOT NULL,
  html_template text NOT NULL,
  text_template text,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  performance_score numeric(5,2) DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table du contenu IA pour newsletter
CREATE TABLE IF NOT EXISTS ai_newsletter_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content_html text NOT NULL,
  content_text text,
  keywords text[],
  target_audience text,
  ai_model_used text,
  quality_score numeric(5,2),
  used_in_campaign_id uuid,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'used', 'archived')),
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Ajout de la colonne campaign_id dans email_send_log si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_send_log' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE email_send_log ADD COLUMN campaign_id uuid;
  END IF;
END $$;

-- Fonction pour sélectionner le provider optimal
CREATE OR REPLACE FUNCTION select_optimal_email_provider()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider text;
BEGIN
  -- Réinitialiser les compteurs journaliers si nécessaire
  UPDATE email_providers
  SET current_daily_sent = 0, 
      last_reset_daily = CURRENT_DATE
  WHERE last_reset_daily < CURRENT_DATE;
  
  -- Réinitialiser les compteurs mensuels si nécessaire
  UPDATE email_providers
  SET current_monthly_sent = 0,
      last_reset_monthly = CURRENT_DATE
  WHERE DATE_TRUNC('month', last_reset_monthly) < DATE_TRUNC('month', CURRENT_DATE);
  
  -- Sélectionner le provider avec le plus de capacité disponible
  SELECT name INTO v_provider
  FROM email_providers
  WHERE is_active = true
    AND current_daily_sent < daily_limit
    AND current_monthly_sent < monthly_limit
  ORDER BY priority ASC, current_daily_sent ASC
  LIMIT 1;
  
  -- Par défaut, retourner Brevo
  RETURN COALESCE(v_provider, 'brevo');
END;
$$;

-- Fonction pour incrémenter les compteurs
CREATE OR REPLACE FUNCTION increment_provider_counters(p_provider text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_providers
  SET 
    current_daily_sent = current_daily_sent + 1,
    current_monthly_sent = current_monthly_sent + 1,
    updated_at = now()
  WHERE name = p_provider;
END;
$$;

-- RLS pour email_providers
ALTER TABLE email_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read email_providers" ON email_providers;
CREATE POLICY "Allow authenticated read email_providers" ON email_providers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated update email_providers" ON email_providers;
CREATE POLICY "Allow authenticated update email_providers" ON email_providers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS pour newsletter_subscribers
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert newsletter_subscribers" ON newsletter_subscribers;
CREATE POLICY "Allow public insert newsletter_subscribers" ON newsletter_subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all newsletter_subscribers" ON newsletter_subscribers;
CREATE POLICY "Allow authenticated all newsletter_subscribers" ON newsletter_subscribers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read own subscription" ON newsletter_subscribers;
CREATE POLICY "Allow anon read own subscription" ON newsletter_subscribers
  FOR SELECT TO anon USING (true);

-- RLS pour newsletter_campaigns
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all newsletter_campaigns" ON newsletter_campaigns;
CREATE POLICY "Allow authenticated all newsletter_campaigns" ON newsletter_campaigns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS pour email_templates_universal
ALTER TABLE email_templates_universal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all email_templates_universal" ON email_templates_universal;
CREATE POLICY "Allow authenticated all email_templates_universal" ON email_templates_universal
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read email_templates_universal" ON email_templates_universal;
CREATE POLICY "Allow anon read email_templates_universal" ON email_templates_universal
  FOR SELECT TO anon USING (is_active = true);

-- RLS pour ai_newsletter_content
ALTER TABLE ai_newsletter_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all ai_newsletter_content" ON ai_newsletter_content;
CREATE POLICY "Allow authenticated all ai_newsletter_content" ON ai_newsletter_content
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permissions
GRANT EXECUTE ON FUNCTION select_optimal_email_provider() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_provider_counters(text) TO authenticated, anon;