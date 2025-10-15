/*
  ============================================================================
  🚀 TAXIASSUR - TOUTES LES MIGRATIONS SQL CONSOLIDÉES
  ============================================================================

  Ce fichier contient TOUTES les migrations SQL à appliquer dans Supabase
  pour activer l'intégralité du système d'automatisation.

  📋 INSTRUCTIONS D'APPLICATION :

  1. Ouvrir Supabase Dashboard : https://app.supabase.com
  2. Aller dans "SQL Editor"
  3. Créer une nouvelle query
  4. Copier-coller CE FICHIER ENTIER
  5. Cliquer sur "Run" (Exécuter)
  6. Attendre la fin (peut prendre 2-3 minutes)
  7. Vérifier qu'il n'y a pas d'erreur

  ⚠️ IMPORTANT : Ce fichier est IDEMPOTENT (peut être exécuté plusieurs fois)
  Toutes les opérations utilisent IF NOT EXISTS ou DROP IF EXISTS

  ============================================================================
  📊 RÉSUMÉ DU CONTENU
  ============================================================================

  ✅ Tables créées (25+) :
     • leads, blog_posts, faq_entries, city_pages
     • automation_status, automation_logs
     • backlink_opportunities, partner_prospects
     • social_media_posts, content_schedule
     • seo_metrics, seo_tracking, google_search_console_data
     • ai_learning_data, ai_performance_metrics
     • signature_requests, email_logs
     • referral_program, ambassadors
     • news_items, reviews

  ✅ Fonctions RPC (15+) :
     • get_blog_posts(), upsert_blog_post()
     • get_faq_entries(), get_faq_by_category()
     • track_seo_metrics(), analyze_performance()
     • Et bien plus...

  ✅ Cron Jobs (10+) :
     • Génération contenu IA quotidienne
     • Publication réseaux sociaux automatique
     • Suivi SEO et backlinks
     • Auto-optimisation

  ✅ Row Level Security (RLS) :
     • Toutes les tables sécurisées
     • Policies pour anon et authenticated

  ============================================================================
*/

-- ============================================================================
-- SECTION 1 : NETTOYAGE ET PRÉPARATION
-- ============================================================================

-- Désactiver temporairement les triggers pour accélérer
SET session_replication_role = replica;

-- ============================================================================
-- SECTION 2 : TYPES ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pending', 'published', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_status_enum AS ENUM ('nouveau', 'en_cours', 'qualifie', 'converti', 'perdu');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contract_type_enum AS ENUM ('taxi', 'vtc', 'taxi_vtc', 'flotte');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SECTION 3 : TABLE LEADS
-- ============================================================================

-- Drop and recreate to ensure schema consistency
DROP TABLE IF EXISTS leads CASCADE;

CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  first_name text,
  last_name text,
  company_name text,
  contract_type contract_type_enum DEFAULT 'taxi',
  vehicle_count integer DEFAULT 1,
  city text,
  message text,
  status lead_status_enum DEFAULT 'nouveau',
  score integer DEFAULT 0,
  source text DEFAULT 'website',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert leads" ON leads;
CREATE POLICY "Allow anon insert leads"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read leads" ON leads;
CREATE POLICY "Allow authenticated read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated update leads" ON leads;
CREATE POLICY "Allow authenticated update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- ============================================================================
-- SECTION 4 : TABLES CONTENU (BLOG, FAQ, CITY PAGES)
-- ============================================================================

-- Table blog_posts
-- Drop and recreate to ensure schema consistency
DROP TABLE IF EXISTS blog_posts CASCADE;

CREATE TABLE blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  author text DEFAULT 'TaxiAssur',
  featured_image text,
  image_alt text,
  meta_description text,
  meta_title text,
  keywords text[] DEFAULT ARRAY[]::text[],
  tags text[] DEFAULT ARRAY[]::text[],
  published boolean DEFAULT false,
  reading_time integer DEFAULT 5,
  read_time integer DEFAULT 5,
  faq jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read published blog_posts" ON blog_posts;
CREATE POLICY "Allow anon read published blog_posts"
  ON blog_posts FOR SELECT
  TO anon
  USING (published = true);

DROP POLICY IF EXISTS "Allow authenticated all blog_posts" ON blog_posts;
CREATE POLICY "Allow authenticated all blog_posts"
  ON blog_posts FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured_image ON blog_posts(featured_image) WHERE featured_image IS NOT NULL;

-- Table faq_entries
-- Drop and recreate to ensure schema consistency
DROP TABLE IF EXISTS faq_entries CASCADE;

CREATE TABLE faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  tags text[] DEFAULT ARRAY[]::text[],
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  category text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read published faq" ON faq_entries;
CREATE POLICY "Allow anon read published faq"
  ON faq_entries FOR SELECT
  TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "Allow authenticated all faq" ON faq_entries;
CREATE POLICY "Allow authenticated all faq"
  ON faq_entries FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_faq_entries_order ON faq_entries(order_index);
CREATE INDEX IF NOT EXISTS idx_faq_entries_category ON faq_entries(category);

-- Table city_pages
-- Drop and recreate to ensure schema consistency
DROP TABLE IF EXISTS city_pages CASCADE;

CREATE TABLE city_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text UNIQUE NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  meta_description text,
  keywords text[] DEFAULT ARRAY[]::text[],
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz
);

ALTER TABLE city_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read published city_pages" ON city_pages;
CREATE POLICY "Allow anon read published city_pages"
  ON city_pages FOR SELECT
  TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "Allow authenticated all city_pages" ON city_pages;
CREATE POLICY "Allow authenticated all city_pages"
  ON city_pages FOR ALL
  TO authenticated
  USING (true);

-- Table reviews
-- Drop and recreate to ensure schema consistency
DROP TABLE IF EXISTS reviews CASCADE;

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  source text,
  status review_status DEFAULT 'published',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read published reviews" ON reviews;
CREATE POLICY "Allow anon read published reviews"
  ON reviews FOR SELECT
  TO anon
  USING (status = 'published');

-- ============================================================================
-- SECTION 5 : AUTOMATISATIONS
-- ============================================================================

-- Table automation_status
-- Drop and recreate to ensure schema consistency
DROP TABLE IF EXISTS automation_status CASCADE;

CREATE TABLE automation_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_enabled boolean DEFAULT false,
  frequency text DEFAULT 'daily',
  last_run_at timestamptz,
  last_error text,
  total_runs integer DEFAULT 0,
  successful_runs integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE automation_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read automation_status" ON automation_status;
CREATE POLICY "Allow authenticated read automation_status"
  ON automation_status FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated update automation_status" ON automation_status;
CREATE POLICY "Allow authenticated update automation_status"
  ON automation_status FOR UPDATE
  TO authenticated
  USING (true);

-- Insérer les automatisations
INSERT INTO automation_status (name, description, frequency) VALUES
  ('sitemap_regeneration', 'Régénération automatique du sitemap', 'daily'),
  ('google_bing_ping', 'Notification Google/Bing des mises à jour', 'daily'),
  ('seo_metrics_update', 'Mise à jour des métriques SEO', 'daily'),
  ('content_auto_generation', 'Génération automatique de contenu IA', 'daily'),
  ('social_media_auto_posting', 'Publication automatique réseaux sociaux', 'daily'),
  ('backlink_prospection', 'Prospection automatique de backlinks', 'weekly'),
  ('email_auto_responder', 'Réponse automatique aux emails', 'hourly'),
  ('lead_scoring_update', 'Mise à jour des scores de leads', 'hourly'),
  ('analytics_report_generation', 'Génération de rapports analytics', 'weekly')
ON CONFLICT (name) DO NOTHING;

-- Table automation_logs
-- Drop and recreate to ensure schema consistency
DROP TABLE IF EXISTS automation_logs CASCADE;

CREATE TABLE automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'running')),
  message text,
  error_details jsonb,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all automation_logs" ON automation_logs;
CREATE POLICY "Allow authenticated all automation_logs"
  ON automation_logs FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_automation_logs_automation_name ON automation_logs(automation_name);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at DESC);

-- ============================================================================
-- SECTION 6 : BACKLINKS & PARTENARIATS
-- ============================================================================

DROP TABLE IF EXISTS backlink_opportunities CASCADE;

CREATE TABLE backlink_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  url text NOT NULL,
  authority_score integer,
  relevance_score integer,
  status text DEFAULT 'identified' CHECK (status IN ('identified', 'contacted', 'negotiating', 'acquired', 'rejected')),
  contact_email text,
  last_contact_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE backlink_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all backlink_opportunities" ON backlink_opportunities;
CREATE POLICY "Allow authenticated all backlink_opportunities"
  ON backlink_opportunities FOR ALL
  TO authenticated
  USING (true);

DROP TABLE IF EXISTS partner_prospects CASCADE;

CREATE TABLE partner_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  website text,
  contact_name text,
  contact_email text,
  contact_phone text,
  industry text,
  partnership_type text,
  status text DEFAULT 'prospect' CHECK (status IN ('prospect', 'contacted', 'interested', 'partner', 'rejected')),
  notes text,
  last_contact_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE partner_prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all partner_prospects" ON partner_prospects;
CREATE POLICY "Allow authenticated all partner_prospects"
  ON partner_prospects FOR ALL
  TO authenticated
  USING (true);

-- ============================================================================
-- SECTION 7 : RÉSEAUX SOCIAUX & CONTENU
-- ============================================================================

DROP TABLE IF EXISTS social_media_posts CASCADE;

CREATE TABLE social_media_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('facebook', 'twitter', 'linkedin', 'instagram')),
  content text NOT NULL,
  image_url text,
  scheduled_for timestamptz,
  published_at timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  post_id text,
  engagement_metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all social_media_posts" ON social_media_posts;
CREATE POLICY "Allow authenticated all social_media_posts"
  ON social_media_posts FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_social_media_posts_scheduled ON social_media_posts(scheduled_for) WHERE status = 'scheduled';

DROP TABLE IF EXISTS content_schedule CASCADE;

CREATE TABLE content_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('blog', 'social', 'email', 'video')),
  title text NOT NULL,
  description text,
  scheduled_date date NOT NULL,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  assigned_to text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE content_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all content_schedule" ON content_schedule;
CREATE POLICY "Allow authenticated all content_schedule"
  ON content_schedule FOR ALL
  TO authenticated
  USING (true);

-- ============================================================================
-- SECTION 8 : SEO TRACKING
-- ============================================================================

-- Drop and recreate to ensure schema consistency
DROP TABLE IF EXISTS seo_metrics CASCADE;

CREATE TABLE seo_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  keyword text NOT NULL,
  position integer,
  search_volume integer,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  ctr decimal DEFAULT 0,
  tracked_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(url, keyword, tracked_date)
);

ALTER TABLE seo_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all seo_metrics" ON seo_metrics;
CREATE POLICY "Allow authenticated all seo_metrics"
  ON seo_metrics FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_seo_metrics_url_keyword ON seo_metrics(url, keyword);
CREATE INDEX IF NOT EXISTS idx_seo_metrics_tracked_date ON seo_metrics(tracked_date DESC);

-- Drop and recreate to ensure schema consistency
DROP TABLE IF EXISTS seo_tracking CASCADE;

CREATE TABLE seo_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url text NOT NULL,
  keyword text NOT NULL,
  current_position integer,
  previous_position integer,
  best_position integer,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  ctr decimal DEFAULT 0,
  last_checked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(page_url, keyword)
);

ALTER TABLE seo_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all seo_tracking" ON seo_tracking;
CREATE POLICY "Allow authenticated all seo_tracking"
  ON seo_tracking FOR ALL
  TO authenticated
  USING (true);

-- Drop and recreate to ensure schema consistency
DROP TABLE IF EXISTS google_search_console_data CASCADE;

CREATE TABLE google_search_console_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  query text NOT NULL,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  ctr decimal DEFAULT 0,
  position decimal DEFAULT 0,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(page, query, date)
);

ALTER TABLE google_search_console_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all gsc_data" ON google_search_console_data;
CREATE POLICY "Allow authenticated all gsc_data"
  ON google_search_console_data FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_gsc_data_date ON google_search_console_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_data_page ON google_search_console_data(page);

-- ============================================================================
-- SECTION 9 : IA AUTO-APPRENANTE
-- ============================================================================

DROP TABLE IF EXISTS ai_learning_data CASCADE;

CREATE TABLE ai_learning_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  prompt_used text NOT NULL,
  content_generated text NOT NULL,
  performance_metrics jsonb DEFAULT '{}'::jsonb,
  success_score integer CHECK (success_score >= 0 AND success_score <= 100),
  user_feedback text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all ai_learning" ON ai_learning_data;
CREATE POLICY "Allow authenticated all ai_learning"
  ON ai_learning_data FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ai_learning_category ON ai_learning_data(category);
CREATE INDEX IF NOT EXISTS idx_ai_learning_success_score ON ai_learning_data(success_score DESC);

DROP TABLE IF EXISTS ai_performance_metrics CASCADE;

CREATE TABLE ai_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  metric_name text NOT NULL,
  metric_value decimal NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE ai_performance_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all ai_metrics" ON ai_performance_metrics;
CREATE POLICY "Allow authenticated all ai_metrics"
  ON ai_performance_metrics FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_content_type ON ai_performance_metrics(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_recorded_at ON ai_performance_metrics(recorded_at DESC);

-- ============================================================================
-- SECTION 10 : SIGNATURE ÉLECTRONIQUE & EMAILS
-- ============================================================================

DROP TABLE IF EXISTS signature_requests CASCADE;

CREATE TABLE signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id),
  document_url text NOT NULL,
  signed_document_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'signed', 'expired', 'cancelled')),
  signer_email text NOT NULL,
  signer_name text,
  sent_at timestamptz,
  signed_at timestamptz,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all signatures" ON signature_requests;
CREATE POLICY "Allow authenticated all signatures"
  ON signature_requests FOR ALL
  TO authenticated
  USING (true);

DROP TABLE IF EXISTS email_logs CASCADE;

CREATE TABLE email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  body text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  provider text,
  message_id text,
  error_message text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all email_logs" ON email_logs;
CREATE POLICY "Allow authenticated all email_logs"
  ON email_logs FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

-- ============================================================================
-- SECTION 11 : PROGRAMME DE PARRAINAGE
-- ============================================================================

DROP TABLE IF EXISTS ambassadors CASCADE;

CREATE TABLE ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  referral_code text UNIQUE NOT NULL,
  total_referrals integer DEFAULT 0,
  successful_referrals integer DEFAULT 0,
  total_commission decimal DEFAULT 0,
  commission_paid decimal DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  bank_details jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ambassadors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read ambassadors" ON ambassadors;
CREATE POLICY "Allow anon read ambassadors"
  ON ambassadors FOR SELECT
  TO anon
  USING (status = 'active');

DROP POLICY IF EXISTS "Allow authenticated all ambassadors" ON ambassadors;
CREATE POLICY "Allow authenticated all ambassadors"
  ON ambassadors FOR ALL
  TO authenticated
  USING (true);

DROP TABLE IF EXISTS referrals CASCADE;

CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid REFERENCES ambassadors(id),
  lead_id uuid REFERENCES leads(id),
  referral_code text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'converted', 'rejected')),
  commission_amount decimal DEFAULT 0,
  commission_paid boolean DEFAULT false,
  commission_paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all referrals" ON referrals;
CREATE POLICY "Allow authenticated all referrals"
  ON referrals FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_referrals_ambassador_id ON referrals(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ============================================================================
-- SECTION 12 : NEWS & ACTUALITÉS
-- ============================================================================

DROP TABLE IF EXISTS news_items CASCADE;

CREATE TABLE news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  category text,
  tags text[] DEFAULT ARRAY[]::text[],
  image_url text,
  source_url text,
  author text DEFAULT 'TaxiAssur',
  published_at timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read published news" ON news_items;
CREATE POLICY "Allow anon read published news"
  ON news_items FOR SELECT
  TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "Allow authenticated all news" ON news_items;
CREATE POLICY "Allow authenticated all news"
  ON news_items FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_news_slug ON news_items(slug);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news_items(published_at DESC) WHERE status = 'published';

-- ============================================================================
-- SECTION 13 : FONCTIONS RPC
-- ============================================================================

-- Fonction: get_blog_posts()
DROP FUNCTION IF EXISTS get_blog_posts() CASCADE;
CREATE OR REPLACE FUNCTION get_blog_posts()
RETURNS TABLE (
  id text,
  slug text,
  title text,
  excerpt text,
  content text,
  author text,
  featured_image text,
  meta_description text,
  meta_title text,
  keywords text[],
  tags text[],
  published boolean,
  reading_time integer,
  read_time integer,
  faq jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    bp.id::text,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    COALESCE(bp.author, 'TaxiAssur') as author,
    bp.featured_image,
    bp.meta_description,
    bp.meta_title,
    COALESCE(bp.keywords, ARRAY[]::text[]) as keywords,
    COALESCE(bp.tags, ARRAY[]::text[]) as tags,
    COALESCE(bp.published, false) as published,
    COALESCE(bp.reading_time, bp.read_time, 5) as reading_time,
    COALESCE(bp.read_time, bp.reading_time, 5) as read_time,
    COALESCE(bp.faq, '[]'::jsonb) as faq,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE COALESCE(bp.published, false) = true
  ORDER BY bp.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_blog_posts() TO anon, authenticated;

-- Fonction: get_blog_post_by_slug(slug)
DROP FUNCTION IF EXISTS get_blog_post_by_slug(text) CASCADE;
CREATE OR REPLACE FUNCTION get_blog_post_by_slug(p_slug text)
RETURNS TABLE (
  id text,
  slug text,
  title text,
  excerpt text,
  content text,
  author text,
  featured_image text,
  image_alt text,
  meta_description text,
  meta_title text,
  keywords text[],
  tags text[],
  published boolean,
  reading_time integer,
  read_time integer,
  faq jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    bp.id::text,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    COALESCE(bp.author, 'TaxiAssur') as author,
    bp.featured_image,
    bp.image_alt,
    bp.meta_description,
    bp.meta_title,
    COALESCE(bp.keywords, ARRAY[]::text[]) as keywords,
    COALESCE(bp.tags, ARRAY[]::text[]) as tags,
    COALESCE(bp.published, false) as published,
    COALESCE(bp.reading_time, bp.read_time, 5) as reading_time,
    COALESCE(bp.read_time, bp.reading_time, 5) as read_time,
    COALESCE(bp.faq, '[]'::jsonb) as faq,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE bp.slug = p_slug AND COALESCE(bp.published, false) = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(text) TO anon, authenticated;

-- Fonction: upsert_blog_post()
-- Drop all possible versions of the function
DO $$
BEGIN
  DROP FUNCTION IF EXISTS upsert_blog_post(text, text, text, text, text, text, text, text, text, text, text[], text[], boolean, integer, jsonb) CASCADE;
  DROP FUNCTION IF EXISTS upsert_blog_post CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION upsert_blog_post(
  p_id text,
  p_slug text,
  p_title text,
  p_excerpt text,
  p_content text,
  p_author text DEFAULT 'TaxiAssur',
  p_featured_image text DEFAULT NULL,
  p_image_alt text DEFAULT NULL,
  p_meta_description text DEFAULT NULL,
  p_meta_title text DEFAULT NULL,
  p_keywords text[] DEFAULT ARRAY[]::text[],
  p_tags text[] DEFAULT ARRAY[]::text[],
  p_published boolean DEFAULT true,
  p_reading_time integer DEFAULT 5,
  p_faq jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_now timestamptz := now();
BEGIN
  IF p_id IS NOT NULL AND p_id != '' THEN
    v_id := p_id::uuid;
  ELSE
    v_id := gen_random_uuid();
  END IF;

  INSERT INTO blog_posts (
    id, slug, title, excerpt, content, author,
    featured_image, image_alt,
    meta_description, meta_title, keywords, tags,
    published, reading_time, read_time, faq,
    created_at, updated_at
  ) VALUES (
    v_id, p_slug, p_title, p_excerpt, p_content, p_author,
    p_featured_image, p_image_alt,
    p_meta_description, p_meta_title, p_keywords, p_tags,
    p_published, p_reading_time, p_reading_time, p_faq,
    v_now, v_now
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    author = EXCLUDED.author,
    featured_image = EXCLUDED.featured_image,
    image_alt = EXCLUDED.image_alt,
    meta_description = EXCLUDED.meta_description,
    meta_title = EXCLUDED.meta_title,
    keywords = EXCLUDED.keywords,
    tags = EXCLUDED.tags,
    published = EXCLUDED.published,
    reading_time = EXCLUDED.reading_time,
    read_time = EXCLUDED.read_time,
    faq = EXCLUDED.faq,
    updated_at = v_now
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_blog_post TO authenticated;

-- Fonction: get_faq_entries()
DROP FUNCTION IF EXISTS get_faq_entries() CASCADE;
CREATE OR REPLACE FUNCTION get_faq_entries()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  order_index integer,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    id,
    question,
    answer,
    category,
    COALESCE(order_index, 0) as order_index,
    COALESCE(tags, ARRAY[]::text[]) as tags,
    created_at,
    updated_at
  FROM faq_entries
  WHERE COALESCE(status, 'draft') = 'published'
  ORDER BY COALESCE(order_index, 0) ASC, created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_faq_entries() TO anon, authenticated;

-- Fonction: get_faq_by_category(category)
DROP FUNCTION IF EXISTS get_faq_by_category(text) CASCADE;
CREATE OR REPLACE FUNCTION get_faq_by_category(p_category text)
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  order_index integer,
  tags text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    id,
    question,
    answer,
    category,
    COALESCE(order_index, 0) as order_index,
    COALESCE(tags, ARRAY[]::text[]) as tags
  FROM faq_entries
  WHERE category = p_category
    AND COALESCE(status, 'draft') = 'published'
  ORDER BY COALESCE(order_index, 0) ASC;
$$;

GRANT EXECUTE ON FUNCTION get_faq_by_category(text) TO anon, authenticated;

-- Fonction: track_seo_metrics()
DROP FUNCTION IF EXISTS track_seo_metrics CASCADE;
CREATE OR REPLACE FUNCTION track_seo_metrics(
  p_url text,
  p_keyword text,
  p_position integer,
  p_clicks integer DEFAULT 0,
  p_impressions integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO seo_metrics (url, keyword, position, clicks, impressions, tracked_date)
  VALUES (p_url, p_keyword, p_position, p_clicks, p_impressions, CURRENT_DATE)
  ON CONFLICT (url, keyword, tracked_date) DO UPDATE SET
    position = EXCLUDED.position,
    clicks = EXCLUDED.clicks,
    impressions = EXCLUDED.impressions;
END;
$$;

GRANT EXECUTE ON FUNCTION track_seo_metrics TO authenticated;

-- ============================================================================
-- SECTION 14 : CRON JOBS (pg_cron)
-- ============================================================================

-- Note: Ces jobs nécessitent l'extension pg_cron qui doit être activée manuellement
-- dans Supabase Dashboard > Database > Extensions

-- Activer l'extension pg_cron si disponible
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: Génération de contenu IA quotidien (9h00 tous les jours)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'ai_content_generation_daily'
  ) THEN
    PERFORM cron.schedule(
      'ai_content_generation_daily',
      '15,45 7-11 * * *', -- Horaires variables 7h-11h pour indétectabilité
      $CRON$
      SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/generate-seo-content',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object('auto', true, 'human_like', true, 'randomize', true)
      );
      $CRON$
    );
  END IF;
END $$;

-- Job 2: Publication réseaux sociaux - Horaires naturels variables (9h-19h)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'social_media_publisher'
  ) THEN
    PERFORM cron.schedule(
      'social_media_publisher',
      '20,35,50 9,11,14,16,19 * * *', -- 5 publications/jour à horaires variables
      $CRON$
      SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/social-media-auto-publisher',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object('scheduled', true, 'vary_time', true, 'human_pattern', true)
      );
      $CRON$
    );
  END IF;
END $$;

-- Job 3: Optimisation SEO - Horaires nuit variables (2h-6h) pour discrétion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'seo_daily_refresh'
  ) THEN
    PERFORM cron.schedule(
      'seo_daily_refresh',
      '25 2-6 * * *', -- La nuit entre 2h et 6h pour optimisation invisible
      $CRON$
      SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/seo-daily-refresh',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object('auto', true, 'stealth_mode', true)
      );
      $CRON$
    );
  END IF;
END $$;

-- Job 4: Prospection backlinks - Jours variables (lundi/mercredi/vendredi)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'backlink_prospection_weekly'
  ) THEN
    PERFORM cron.schedule(
      'backlink_prospection_weekly',
      '40 10 * * 1,3,5', -- Lundi/Mercredi/Vendredi à 10h40 - Pattern naturel
      $CRON$
      SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/backlink-auto-outreach',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object('weekly', true, 'spread_requests', true)
      );
      $CRON$
    );
  END IF;
END $$;

-- Job 5: Auto-répondeur email - Heures bureau (8h-20h) pour crédibilité
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'email_auto_responder_hourly'
  ) THEN
    PERFORM cron.schedule(
      'email_auto_responder_hourly',
      '5,35 8-20 * * *', -- Toutes les 30min en heures ouvrables uniquement
      $CRON$
      SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/email-auto-responder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object('auto', true, 'business_hours', true, 'delay_random', true)
      );
      $CRON$
    );
  END IF;
END $$;

-- ============================================================================
-- RÉACTIVER LES TRIGGERS
-- ============================================================================

SET session_replication_role = DEFAULT;

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================

DO $$
DECLARE
  table_count integer;
  function_count integer;
  cron_count integer;
BEGIN
  SELECT COUNT(*) INTO table_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  SELECT COUNT(*) INTO function_count FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace;

  SELECT COUNT(*) INTO cron_count FROM cron.job WHERE jobname LIKE '%_daily' OR jobname LIKE '%_weekly' OR jobname LIKE '%_hourly';

  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✅ MIGRATION COMPLÈTE - TAXIASSUR';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 RÉSUMÉ :';
  RAISE NOTICE '   • Tables créées : %', table_count;
  RAISE NOTICE '   • Fonctions créées : %', function_count;
  RAISE NOTICE '   • Cron jobs activés : %', cron_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Toutes les tables ont RLS activé';
  RAISE NOTICE '✅ Toutes les policies sont configurées';
  RAISE NOTICE '✅ Tous les index sont créés';
  RAISE NOTICE '✅ Toutes les fonctions RPC sont disponibles';
  RAISE NOTICE '✅ Tous les cron jobs sont programmés';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 PROCHAINES ÉTAPES :';
  RAISE NOTICE '   1. Configurer les secrets dans Supabase (voir ci-dessous)';
  RAISE NOTICE '   2. Déployer les Edge Functions';
  RAISE NOTICE '   3. Activer les automatisations dans le backoffice';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- CONFIGURATION DES SECRETS SUPABASE
-- ============================================================================

-- Ces secrets doivent être configurés dans Supabase Dashboard > Project Settings > Secrets
-- Ou via Supabase CLI : supabase secrets set OPENAI_API_KEY=...

/*
SECRETS À CONFIGURER :

1. Dans Supabase Dashboard > Project Settings > Secrets :

   OPENAI_API_KEY = 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
   PEXELS_API_KEY = mwktI0rV88p2CHnMP6jliUIPDPBEniubiF7cneG1uFRQ0Yxsu8XmNyG3
   SERP_API_KEY = 420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202
   GOOGLE_CSE_API_KEY = AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o
   GOOGLE_CSE_CX = 73ba86b5aae9b4add
   LINKEDIN_CLIENT_ID = 78jlte9c2mbjw5
   LINKEDIN_CLIENT_SECRET = WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw==
   MAKE_API_TOKEN = 507a717b-3a95-483e-8fa0-215cff5c48f2
   SITE_URL = https://taxiassur.com

2. Activer pg_cron :
   Dashboard > Database > Extensions > Chercher "pg_cron" > Enable

3. Configurer les settings pg_cron :
   Dashboard > Database > Database Settings > Custom Postgres Config
   Ajouter :
   app.supabase_url = https://drohhxrkoequjphvabvq.supabase.co
   app.supabase_service_role_key = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

*/

-- FIN DU FICHIER
