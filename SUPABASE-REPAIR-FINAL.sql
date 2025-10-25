/*
  # Réparation finale — Blog & FAQ
  
  1. Tables créées
    - blog_posts (articles de blog avec contenu complet)
    - faq_entries (questions/réponses FAQ)
    
  2. Sécurité
    - RLS activé sur toutes les tables
    - Lecture publique autorisée pour le contenu publié
    - Écriture réservée aux utilisateurs authentifiés
    
  3. Indexes
    - Index sur slug pour recherche rapide
    - Index sur published pour filtrage
    - Index sur created_at pour tri chronologique
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS faq_entries CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text,
  content text NOT NULL,
  author text DEFAULT 'TaxiAssur',
  published boolean DEFAULT true,
  featured_image text,
  meta_title text,
  meta_description text,
  keywords text[],
  read_time integer DEFAULT 5,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create faq_entries table
CREATE TABLE IF NOT EXISTS faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'general',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_entries_category ON faq_entries(category);
CREATE INDEX IF NOT EXISTS idx_faq_entries_order ON faq_entries(order_index);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;

-- Blog Posts RLS Policies
DROP POLICY IF EXISTS "Allow public read published posts" ON blog_posts;
CREATE POLICY "Allow public read published posts"
  ON blog_posts FOR SELECT
  TO anon
  USING (published = true);

DROP POLICY IF EXISTS "Allow authenticated read all posts" ON blog_posts;
CREATE POLICY "Allow authenticated read all posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert posts" ON blog_posts;
CREATE POLICY "Allow authenticated insert posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update posts" ON blog_posts;
CREATE POLICY "Allow authenticated update posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete posts" ON blog_posts;
CREATE POLICY "Allow authenticated delete posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (true);

-- FAQ Entries RLS Policies
DROP POLICY IF EXISTS "Allow public read FAQ" ON faq_entries;
CREATE POLICY "Allow public read FAQ"
  ON faq_entries FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated read FAQ" ON faq_entries;
CREATE POLICY "Allow authenticated read FAQ"
  ON faq_entries FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert FAQ" ON faq_entries;
CREATE POLICY "Allow authenticated insert FAQ"
  ON faq_entries FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update FAQ" ON faq_entries;
CREATE POLICY "Allow authenticated update FAQ"
  ON faq_entries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete FAQ" ON faq_entries;
CREATE POLICY "Allow authenticated delete FAQ"
  ON faq_entries FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_faq_entries_updated_at ON faq_entries;
CREATE TRIGGER update_faq_entries_updated_at
  BEFORE UPDATE ON faq_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
