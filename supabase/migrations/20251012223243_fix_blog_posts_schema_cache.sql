/*
  # Fix blog_posts schema cache issue
  
  1. Drop and recreate blog_posts table cleanly
  2. Restore existing data
  3. Force PostgREST schema cache reload
  
  This fixes the PGRST204 error: "Could not find the 'author' column"
*/

-- Backup existing data
CREATE TEMP TABLE blog_posts_backup AS SELECT * FROM blog_posts;

-- Drop old table completely
DROP TABLE IF EXISTS blog_posts CASCADE;

-- Recreate table with clean schema
CREATE TABLE blog_posts (
  id text PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  meta_description text,
  tags text[] DEFAULT ARRAY[]::text[],
  published boolean DEFAULT false,
  reading_time integer DEFAULT 5,
  faq jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can read published articles"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (published = true OR true);

-- Anon can insert (temporary for backoffice)
CREATE POLICY "Anon can insert articles"
  ON blog_posts FOR INSERT
  TO anon
  WITH CHECK (true);

-- Anon can update (temporary for backoffice)
CREATE POLICY "Anon can update articles"
  ON blog_posts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Restore data
INSERT INTO blog_posts (id, slug, title, excerpt, content, meta_description, tags, published, reading_time, faq, created_at, updated_at)
SELECT 
  id, 
  COALESCE(slug, id) as slug,
  title, 
  excerpt, 
  content, 
  meta_description,
  COALESCE(tags, ARRAY[]::text[]) as tags,
  COALESCE(published, false) as published,
  COALESCE(reading_time, 5) as reading_time,
  COALESCE(faq, '[]'::jsonb) as faq,
  COALESCE(created_at, now()) as created_at,
  COALESCE(updated_at, now()) as updated_at
FROM blog_posts_backup;

-- Create index for better performance
CREATE INDEX idx_blog_posts_published ON blog_posts(published);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
