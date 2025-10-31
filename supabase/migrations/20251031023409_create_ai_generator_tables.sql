/*
  # Création des tables pour le générateur de contenu AI

  1. Nouvelles Tables
    - `blog_posts` - Articles de blog avec colonnes pour SEO
    - `city_pages` - Pages de villes avec données localisées
    - `faq_entries` - Entrées FAQ organisées par catégorie
    - `news_articles` - Articles d'actualité avec statut de publication
    - `content_opportunities` - Opportunités de contenu identifiées

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour permettre l'accès public en lecture
    - Politiques pour permettre l'insertion anonyme
*/

-- Table blog_posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  keywords text[] DEFAULT '{}',
  published boolean DEFAULT false,
  read_time integer DEFAULT 5,
  author text DEFAULT 'TaxiAssur',
  featured_image text,
  image_alt text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to published blog posts"
  ON blog_posts FOR SELECT
  USING (published = true);

CREATE POLICY "Allow anonymous insert blog posts"
  ON blog_posts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update blog posts"
  ON blog_posts FOR UPDATE
  USING (true);

-- Table city_pages
CREATE TABLE IF NOT EXISTS city_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text UNIQUE NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  meta_description text NOT NULL,
  keywords text[] DEFAULT '{}',
  dept text,
  region text,
  population integer,
  taxi_count integer,
  status text DEFAULT 'published',
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE city_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to city pages"
  ON city_pages FOR SELECT
  USING (status = 'published');

CREATE POLICY "Allow anonymous insert city pages"
  ON city_pages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update city pages"
  ON city_pages FOR UPDATE
  USING (true);

-- Table faq_entries
CREATE TABLE IF NOT EXISTS faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'Général',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to faq entries"
  ON faq_entries FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous insert faq entries"
  ON faq_entries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update faq entries"
  ON faq_entries FOR UPDATE
  USING (true);

-- Table news_articles
CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  excerpt text NOT NULL,
  image_url text,
  category text DEFAULT 'Réglementation',
  tags text[] DEFAULT '{}',
  status text DEFAULT 'published',
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to news articles"
  ON news_articles FOR SELECT
  USING (status = 'published');

CREATE POLICY "Allow anonymous insert news articles"
  ON news_articles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update news articles"
  ON news_articles FOR UPDATE
  USING (true);

-- Table content_opportunities
CREATE TABLE IF NOT EXISTS content_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  priority text DEFAULT 'medium',
  search_volume integer DEFAULT 0,
  competition text DEFAULT 'low',
  trend text DEFAULT 'stable',
  suggested_title text NOT NULL,
  suggested_questions text[] DEFAULT '{}',
  estimated_traffic integer DEFAULT 0,
  difficulty integer DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE content_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to content opportunities"
  ON content_opportunities FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous insert content opportunities"
  ON content_opportunities FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update content opportunities"
  ON content_opportunities FOR UPDATE
  USING (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_city_pages_slug ON city_pages(slug);
CREATE INDEX IF NOT EXISTS idx_city_pages_city ON city_pages(city);
CREATE INDEX IF NOT EXISTS idx_news_articles_slug ON news_articles(slug);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_keyword ON content_opportunities(keyword);