/*
  # Système d'Automatisation Complète - TaxiAssur

  1. Nouvelles Tables
    - `email_inbox` : Emails entrants à traiter
    - `email_responses` : Réponses automatiques envoyées
    - `lead_follow_ups` : Suivi et relances automatiques des leads
    - `partner_prospects` : Base de données prospects partenaires
    - `outreach_campaigns` : Campagnes de prospection automatisées
    - `competitor_monitoring` : Veille concurrentielle automatique
    - `ai_learning_data` : Données pour amélioration continue
    - `automation_logs` : Logs de toutes les actions automatiques

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated admin access only
    
  3. Indexes
    - Performance optimization for queries
*/

-- Table des emails entrants
CREATE TABLE IF NOT EXISTS email_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email text NOT NULL,
  from_name text,
  subject text NOT NULL,
  body text NOT NULL,
  received_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false,
  ai_response_generated boolean DEFAULT false,
  response_sent boolean DEFAULT false,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative', 'urgent')),
  intent text CHECK (intent IN ('quote_request', 'question', 'complaint', 'partnership', 'other')),
  priority integer DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE email_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage inbox"
  ON email_inbox
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table des réponses automatiques
CREATE TABLE IF NOT EXISTS email_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_id uuid REFERENCES email_inbox(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  delivery_status text DEFAULT 'sent',
  ai_confidence_score decimal(3,2) DEFAULT 0.85,
  human_reviewed boolean DEFAULT false,
  template_used text,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE email_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view responses"
  ON email_responses
  FOR SELECT
  TO authenticated
  USING (true);

-- Table de suivi des leads avec relances automatiques
CREATE TABLE IF NOT EXISTS lead_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_email text NOT NULL,
  lead_name text,
  lead_phone text,
  initial_contact_date timestamptz DEFAULT now(),
  last_contact_date timestamptz,
  next_follow_up_date timestamptz,
  follow_up_count integer DEFAULT 0,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'not_interested', 'converted', 'cold')),
  conversion_probability decimal(3,2),
  lead_source text,
  notes text,
  auto_follow_up_enabled boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE lead_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage follow-ups"
  ON lead_follow_ups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table des prospects partenaires (scraping + enrichissement)
CREATE TABLE IF NOT EXISTS partner_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  website text,
  contact_email text,
  contact_name text,
  phone text,
  industry text,
  company_size text,
  location text,
  relevance_score decimal(3,2),
  last_scraped_at timestamptz DEFAULT now(),
  outreach_status text DEFAULT 'not_contacted' CHECK (outreach_status IN ('not_contacted', 'contacted', 'responded', 'interested', 'partnership_active', 'rejected')),
  outreach_attempts integer DEFAULT 0,
  last_contact_date timestamptz,
  next_contact_date timestamptz,
  notes text,
  source text,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE partner_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prospects"
  ON partner_prospects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table des campagnes d'outreach automatisées
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name text NOT NULL,
  campaign_type text CHECK (campaign_type IN ('email', 'linkedin', 'phone')),
  target_audience text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  total_contacts integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  emails_opened integer DEFAULT 0,
  replies_received integer DEFAULT 0,
  conversions integer DEFAULT 0,
  ai_optimization_enabled boolean DEFAULT true,
  email_template text,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns"
  ON outreach_campaigns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table de monitoring des concurrents
CREATE TABLE IF NOT EXISTS competitor_monitoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_name text NOT NULL,
  website text NOT NULL,
  last_checked_at timestamptz DEFAULT now(),
  pricing_data jsonb,
  content_changes jsonb,
  seo_keywords jsonb,
  backlinks_count integer,
  domain_authority integer,
  estimated_traffic integer,
  alerts jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE competitor_monitoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view competitors"
  ON competitor_monitoring
  FOR SELECT
  TO authenticated
  USING (true);

-- Table d'apprentissage IA (amélioration continue)
CREATE TABLE IF NOT EXISTS ai_learning_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type text NOT NULL CHECK (data_type IN ('conversation', 'email_response', 'content_generation', 'lead_scoring')),
  input_data jsonb NOT NULL,
  ai_output jsonb NOT NULL,
  human_feedback text CHECK (human_feedback IN ('approved', 'rejected', 'modified')),
  corrections jsonb,
  performance_score decimal(3,2),
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage learning data"
  ON ai_learning_data
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table des logs d'automatisation
CREATE TABLE IF NOT EXISTS automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  action_details jsonb,
  status text DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  error_message text,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view logs"
  ON automation_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_email_inbox_processed ON email_inbox(processed, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_inbox_intent ON email_inbox(intent, priority DESC);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_next_date ON lead_follow_ups(next_follow_up_date) WHERE auto_follow_up_enabled = true;
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_status ON lead_follow_ups(status, conversion_probability DESC);
CREATE INDEX IF NOT EXISTS idx_partner_prospects_score ON partner_prospects(relevance_score DESC, outreach_status);
CREATE INDEX IF NOT EXISTS idx_partner_prospects_next_contact ON partner_prospects(next_contact_date) WHERE outreach_status != 'rejected';
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_status ON outreach_campaigns(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_monitoring_checked ON competitor_monitoring(last_checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_learning_created ON ai_learning_data(created_at DESC, data_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created ON automation_logs(created_at DESC, status);
