/*
  # Content Management System Tables

  1. New Tables
    - `blog_posts`
      - `id` (uuid, primary key)
      - `title` (text)
      - `slug` (text, unique, for SEO-friendly URLs)
      - `excerpt` (text, max 220 chars)
      - `content` (text, HTML content)
      - `meta_description` (text, for SEO)
      - `tags` (text[], for categorization)
      - `cover_image` (text, optional)
      - `author` (text, default 'TaxiAssur')
      - `reading_time` (integer, estimated minutes)
      - `status` (enum: draft, published, scheduled)
      - `published_at` (timestamptz, for scheduling)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `faq_entries`
      - `id` (uuid, primary key)
      - `question` (text)
      - `answer` (text)
      - `tags` (text[])
      - `status` (enum: draft, published)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `reviews`
      - `id` (uuid, primary key)
      - `name` (text, reviewer name)
      - `rating` (integer, 1-5)
      - `comment` (text)
      - `source` (text, optional: Google, Trustpilot, etc.)
      - `status` (enum: hidden, published)
      - `created_at` (timestamptz)

    - `content_schedule`
      - `id` (uuid, primary key)
      - `content_type` (enum: blog, faq, review)
      - `frequency_per_week` (integer, how many items to generate per week)
      - `auto_publish` (boolean, publish immediately or as draft)
      - `keywords` (text[], keywords to focus on)
      - `last_generated_at` (timestamptz)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users (backoffice access)
    - Add public read policies for published content
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('draft', 'published', 'scheduled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('hidden', 'published');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('blog', 'faq', 'review');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Blog Posts Table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  meta_description text,
  tags text[] DEFAULT '{}',
  cover_image text,
  author text DEFAULT 'TaxiAssur',
  reading_time integer DEFAULT 5,
  status content_status DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- FAQ Entries Table
CREATE TABLE IF NOT EXISTS faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  tags text[] DEFAULT '{}',
  status content_status DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  source text,
  status review_status DEFAULT 'published',
  created_at timestamptz DEFAULT now()
);

-- Content Schedule Table
CREATE TABLE IF NOT EXISTS content_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type content_type NOT NULL,
  frequency_per_week integer NOT NULL DEFAULT 3,
  auto_publish boolean DEFAULT false,
  keywords text[] DEFAULT '{}',
  last_generated_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_posts
CREATE POLICY "Anyone can view published blog posts"
  ON blog_posts FOR SELECT
  TO public
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));

CREATE POLICY "Authenticated users can manage all blog posts"
  ON blog_posts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for faq_entries
CREATE POLICY "Anyone can view published FAQs"
  ON faq_entries FOR SELECT
  TO public
  USING (status = 'published');

CREATE POLICY "Authenticated users can manage all FAQs"
  ON faq_entries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for reviews
CREATE POLICY "Anyone can view published reviews"
  ON reviews FOR SELECT
  TO public
  USING (status = 'published');

CREATE POLICY "Authenticated users can manage all reviews"
  ON reviews FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for content_schedule
CREATE POLICY "Authenticated users can manage content schedule"
  ON content_schedule FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_faq_entries_status ON faq_entries(status);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- Insert default content schedule configurations
INSERT INTO content_schedule (content_type, frequency_per_week, auto_publish, keywords)
VALUES
  ('blog', 3, false, ARRAY['assurance taxi', 'RC professionnelle', 'devis gratuit']),
  ('faq', 2, true, ARRAY['prix', 'garanties', 'sinistre', 'résiliation'])
ON CONFLICT DO NOTHING;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for auto-updating updated_at
DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
  CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_faq_entries_updated_at ON faq_entries;
  CREATE TRIGGER update_faq_entries_updated_at
    BEFORE UPDATE ON faq_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_content_schedule_updated_at ON content_schedule;
  CREATE TRIGGER update_content_schedule_updated_at
    BEFORE UPDATE ON content_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
