/*
  # Système CRM Universel Intelligent avec IA Collaborative
  
  ## Vue d'ensemble
  Architecture complète pour gérer TOUS les contacts (prospects taxi, clients, partenaires, sites backlinks)
  avec classification IA automatique et routage intelligent des emails.
  
  ## 1. Nouvelles Tables
  
  ### `unified_contacts` - Table centrale pour TOUS les contacts
  - `id` (uuid, PK)
  - `email` (text, unique)
  - `name` (text)
  - `company_name` (text)
  - `website` (text)
  - `phone` (text)
  - `contact_type` (enum: 'prospect_taxi', 'client', 'partner_media', 'partner_directory', 'backlink_site', 'unknown')
  - `status` (enum: 'new', 'contacted', 'engaged', 'converted', 'inactive')
  - `source` (text: 'scraping', 'manual', 'inbound_email', 'form')
  - `classification_confidence` (numeric: 0-100)
  - `ai_notes` (jsonb: notes des différentes IA)
  - `metadata` (jsonb: données flexibles)
  - `last_contact_at` (timestamptz)
  - `conversion_score` (numeric: 0-100)
  - Timestamps
  
  ### `email_conversations` - Historique complet de toutes les conversations
  - `id` (uuid, PK)
  - `contact_id` (uuid, FK → unified_contacts)
  - `thread_id` (text: identifiant de conversation)
  - `direction` (enum: 'inbound', 'outbound')
  - `subject` (text)
  - `content` (text)
  - `html_content` (text)
  - `sender_email` (text)
  - `recipient_email` (text)
  - `brevo_message_id` (text)
  - `classification` (text)
  - `ai_analysis` (jsonb: analyse complète par l'IA)
  - `auto_response_sent` (boolean)
  - `requires_human_review` (boolean)
  - `sentiment` (enum: 'positive', 'neutral', 'negative', 'urgent')
  - `opened_at`, `replied_at`
  - Timestamps
  
  ### `unified_email_campaigns` - Campagnes unifiées tous types
  - `id` (uuid, PK)
  - `name` (text)
  - `campaign_type` (enum: 'devis_taxi', 'backlink_request', 'partnership_media', 'partnership_directory', 'newsletter')
  - `target_contact_type` (text)
  - `status` (enum: 'draft', 'active', 'paused', 'completed')
  - `template_id` (uuid)
  - `daily_send_limit` (int)
  - `auto_send_enabled` (boolean)
  - `ai_optimization_enabled` (boolean)
  - Stats (total_sent, opened, clicked, replied, converted)
  - Timestamps
  
  ### `smart_email_templates` - Templates intelligents par type
  - `id` (uuid, PK)
  - `name` (text)
  - `contact_type` (text)
  - `subject_template` (text)
  - `html_template` (text)
  - `variables` (jsonb: variables dynamiques)
  - `ai_personalization_enabled` (boolean)
  - `conversion_rate` (numeric)
  - Timestamps
  
  ### `ai_decision_log` - Logs de toutes les décisions IA
  - `id` (uuid, PK)
  - `decision_type` (text: 'classification', 'routing', 'response', 'campaign')
  - `ai_agent` (text: 'classifier', 'responder', 'master', 'optimizer')
  - `input_data` (jsonb)
  - `decision_made` (jsonb)
  - `confidence_score` (numeric)
  - `execution_time_ms` (int)
  - `success` (boolean)
  - Timestamps
  
  ### `ai_agent_collaboration` - Communication entre IA
  - `id` (uuid, PK)
  - `source_agent` (text)
  - `target_agent` (text)
  - `message_type` (text: 'request', 'response', 'consultation', 'escalation')
  - `payload` (jsonb)
  - `response` (jsonb)
  - `master_decision` (jsonb)
  - Timestamps
  
  ### `contact_engagement_score` - Scoring d'engagement automatique
  - `contact_id` (uuid, PK FK)
  - `email_opens` (int)
  - `email_clicks` (int)
  - `email_replies` (int)
  - `website_visits` (int)
  - `engagement_score` (numeric: 0-100)
  - `last_calculated_at` (timestamptz)
  
  ## 2. Sécurité RLS
  - Policies restrictives pour toutes les tables
  - Accès admin uniquement via authenticated role
  - Webhook public pour emails entrants (anon)
  
  ## 3. Indexes de Performance
  - Index sur tous les FK
  - Index sur email, contact_type, status
  - Index sur les timestamps pour les requêtes temporelles
  
  ## 4. Fonctions Automatiques
  - Calcul auto du score d'engagement
  - Update auto des stats de campagne
  - Classification auto des nouveaux contacts
*/

-- =====================================================
-- 1. TYPES ENUM
-- =====================================================

DO $$ BEGIN
  CREATE TYPE contact_type AS ENUM (
    'prospect_taxi',
    'client', 
    'partner_media',
    'partner_directory',
    'backlink_site',
    'unknown'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contact_status AS ENUM (
    'new',
    'contacted',
    'engaged',
    'converted',
    'inactive'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE email_direction AS ENUM ('inbound', 'outbound');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE email_sentiment AS ENUM ('positive', 'neutral', 'negative', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_type AS ENUM (
    'devis_taxi',
    'backlink_request',
    'partnership_media',
    'partnership_directory',
    'newsletter'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. TABLE CENTRALE: unified_contacts
-- =====================================================

CREATE TABLE IF NOT EXISTS unified_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  company_name text,
  website text,
  phone text,
  contact_type contact_type DEFAULT 'unknown',
  status contact_status DEFAULT 'new',
  source text DEFAULT 'manual',
  classification_confidence numeric(5,2) DEFAULT 0,
  ai_notes jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  last_contact_at timestamptz,
  conversion_score numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. HISTORIQUE CONVERSATIONS: email_conversations
-- =====================================================

CREATE TABLE IF NOT EXISTS email_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES unified_contacts(id) ON DELETE CASCADE,
  thread_id text,
  direction email_direction NOT NULL,
  subject text,
  content text,
  html_content text,
  sender_email text NOT NULL,
  recipient_email text NOT NULL,
  brevo_message_id text,
  classification text,
  ai_analysis jsonb DEFAULT '{}',
  auto_response_sent boolean DEFAULT false,
  requires_human_review boolean DEFAULT false,
  sentiment email_sentiment DEFAULT 'neutral',
  opened_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 4. CAMPAGNES UNIFIÉES: unified_email_campaigns
-- =====================================================

CREATE TABLE IF NOT EXISTS unified_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  campaign_type campaign_type NOT NULL,
  target_contact_type text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  template_id uuid,
  daily_send_limit int DEFAULT 50,
  auto_send_enabled boolean DEFAULT false,
  ai_optimization_enabled boolean DEFAULT true,
  total_sent int DEFAULT 0,
  total_opened int DEFAULT 0,
  total_clicked int DEFAULT 0,
  total_replied int DEFAULT 0,
  total_converted int DEFAULT 0,
  conversion_rate numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. TEMPLATES INTELLIGENTS: smart_email_templates
-- =====================================================

CREATE TABLE IF NOT EXISTS smart_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_type text NOT NULL,
  subject_template text NOT NULL,
  html_template text NOT NULL,
  variables jsonb DEFAULT '{}',
  ai_personalization_enabled boolean DEFAULT true,
  conversion_rate numeric(5,2) DEFAULT 0,
  times_used int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 6. LOGS DÉCISIONS IA: ai_decision_log
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type text NOT NULL,
  ai_agent text NOT NULL,
  input_data jsonb DEFAULT '{}',
  decision_made jsonb DEFAULT '{}',
  confidence_score numeric(5,2),
  execution_time_ms int,
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 7. COLLABORATION IA: ai_agent_collaboration
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_agent_collaboration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent text NOT NULL,
  target_agent text NOT NULL,
  message_type text NOT NULL,
  payload jsonb DEFAULT '{}',
  response jsonb DEFAULT '{}',
  master_decision jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 8. SCORING ENGAGEMENT: contact_engagement_score
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_engagement_score (
  contact_id uuid PRIMARY KEY REFERENCES unified_contacts(id) ON DELETE CASCADE,
  email_opens int DEFAULT 0,
  email_clicks int DEFAULT 0,
  email_replies int DEFAULT 0,
  website_visits int DEFAULT 0,
  engagement_score numeric(5,2) DEFAULT 0,
  last_calculated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 9. INDEXES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_unified_contacts_email ON unified_contacts(email);
CREATE INDEX IF NOT EXISTS idx_unified_contacts_type ON unified_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_unified_contacts_status ON unified_contacts(status);
CREATE INDEX IF NOT EXISTS idx_unified_contacts_score ON unified_contacts(conversion_score DESC);
CREATE INDEX IF NOT EXISTS idx_unified_contacts_last_contact ON unified_contacts(last_contact_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_conversations_contact ON email_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_conversations_thread ON email_conversations(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_conversations_direction ON email_conversations(direction);
CREATE INDEX IF NOT EXISTS idx_email_conversations_brevo_id ON email_conversations(brevo_message_id);
CREATE INDEX IF NOT EXISTS idx_email_conversations_created ON email_conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_type ON unified_email_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON unified_email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_auto_send ON unified_email_campaigns(auto_send_enabled) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_templates_contact_type ON smart_email_templates(contact_type);
CREATE INDEX IF NOT EXISTS idx_templates_conversion ON smart_email_templates(conversion_rate DESC);

CREATE INDEX IF NOT EXISTS idx_ai_log_agent ON ai_decision_log(ai_agent);
CREATE INDEX IF NOT EXISTS idx_ai_log_created ON ai_decision_log(created_at DESC);

-- =====================================================
-- 10. FONCTION: Calcul automatique score engagement
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_engagement_score(p_contact_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score numeric := 0;
  v_opens int;
  v_clicks int;
  v_replies int;
  v_visits int;
BEGIN
  -- Récupérer les métriques
  SELECT 
    COALESCE(email_opens, 0),
    COALESCE(email_clicks, 0),
    COALESCE(email_replies, 0),
    COALESCE(website_visits, 0)
  INTO v_opens, v_clicks, v_replies, v_visits
  FROM contact_engagement_score
  WHERE contact_id = p_contact_id;
  
  -- Calcul pondéré du score (max 100)
  v_score := LEAST(100, (
    (v_opens * 2) +      -- 2 points par ouverture
    (v_clicks * 5) +     -- 5 points par clic
    (v_replies * 20) +   -- 20 points par réponse
    (v_visits * 10)      -- 10 points par visite
  ));
  
  -- Mise à jour du score
  INSERT INTO contact_engagement_score (contact_id, engagement_score, last_calculated_at)
  VALUES (p_contact_id, v_score, now())
  ON CONFLICT (contact_id) 
  DO UPDATE SET 
    engagement_score = v_score,
    last_calculated_at = now();
  
  -- Mise à jour du contact
  UPDATE unified_contacts
  SET 
    conversion_score = v_score,
    updated_at = now()
  WHERE id = p_contact_id;
  
  RETURN v_score;
END;
$$;

-- =====================================================
-- 11. FONCTION: Update stats campagne
-- =====================================================

CREATE OR REPLACE FUNCTION update_campaign_stats_universal(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE unified_email_campaigns
  SET
    total_sent = (
      SELECT COUNT(*) 
      FROM email_conversations ec
      JOIN unified_contacts uc ON ec.contact_id = uc.id
      WHERE ec.direction = 'outbound'
        AND uc.metadata->>'campaign_id' = p_campaign_id::text
    ),
    total_opened = (
      SELECT COUNT(*) 
      FROM email_conversations ec
      JOIN unified_contacts uc ON ec.contact_id = uc.id
      WHERE ec.direction = 'outbound'
        AND uc.metadata->>'campaign_id' = p_campaign_id::text
        AND ec.opened_at IS NOT NULL
    ),
    total_replied = (
      SELECT COUNT(DISTINCT ec.contact_id)
      FROM email_conversations ec
      JOIN unified_contacts uc ON ec.contact_id = uc.id
      WHERE ec.direction = 'inbound'
        AND uc.metadata->>'campaign_id' = p_campaign_id::text
    ),
    conversion_rate = CASE
      WHEN (SELECT COUNT(*) FROM email_conversations ec JOIN unified_contacts uc ON ec.contact_id = uc.id WHERE ec.direction = 'outbound' AND uc.metadata->>'campaign_id' = p_campaign_id::text) > 0
      THEN (
        (SELECT COUNT(*) FROM unified_contacts WHERE metadata->>'campaign_id' = p_campaign_id::text AND status = 'converted')::numeric /
        (SELECT COUNT(*) FROM email_conversations ec JOIN unified_contacts uc ON ec.contact_id = uc.id WHERE ec.direction = 'outbound' AND uc.metadata->>'campaign_id' = p_campaign_id::text)::numeric * 100
      )
      ELSE 0
    END,
    updated_at = now()
  WHERE id = p_campaign_id;
END;
$$;

-- =====================================================
-- 12. RLS POLICIES
-- =====================================================

ALTER TABLE unified_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_collaboration ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_engagement_score ENABLE ROW LEVEL SECURITY;

-- Policies pour unified_contacts
CREATE POLICY "Admins manage all unified contacts"
  ON unified_contacts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Public can insert new contacts from forms"
  ON unified_contacts FOR INSERT
  TO anon
  WITH CHECK (source = 'form');

-- Policies pour email_conversations
CREATE POLICY "Admins manage all conversations"
  ON email_conversations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Webhooks can insert conversations"
  ON email_conversations FOR INSERT
  TO anon
  WITH CHECK (direction = 'inbound');

-- Policies pour unified_email_campaigns
CREATE POLICY "Admins manage all campaigns"
  ON unified_email_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

-- Policies pour smart_email_templates
CREATE POLICY "Admins manage templates"
  ON smart_email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

-- Policies pour ai_decision_log
CREATE POLICY "Admins read AI logs"
  ON ai_decision_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Service role writes AI logs"
  ON ai_decision_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policies pour ai_agent_collaboration
CREATE POLICY "Admins read AI collaboration"
  ON ai_agent_collaboration FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Service role manages AI collaboration"
  ON ai_agent_collaboration FOR ALL
  TO service_role
  WITH CHECK (true);

-- Policies pour contact_engagement_score
CREATE POLICY "Admins read engagement scores"
  ON contact_engagement_score FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Service role manages engagement scores"
  ON contact_engagement_score FOR ALL
  TO service_role
  WITH CHECK (true);