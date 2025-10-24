/*
  # Fix blog_posts table properly
  
  This migration handles the UUID to text conversion properly
  and ensures the table is clean for PostgREST
*/

-- Drop old backup if exists
DROP TABLE IF EXISTS blog_posts_backup CASCADE;

-- Create clean backup with proper types
CREATE TEMP TABLE blog_posts_backup_clean AS 
SELECT 
  CASE 
    WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN slug  -- Si id est UUID, utiliser le slug
    ELSE id    -- Sinon garder l'id
  END as id,
  slug,
  title,
  excerpt,
  content,
  meta_description,
  tags,
  published,
  reading_time,
  faq,
  created_at,
  updated_at
FROM blog_posts;

-- Drop and recreate table
DROP TABLE IF EXISTS blog_posts CASCADE;

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

-- Restore data
INSERT INTO blog_posts (id, slug, title, excerpt, content, meta_description, tags, published, reading_time, faq, created_at, updated_at)
SELECT 
  COALESCE(slug, id) as id,  -- Utiliser slug comme id si disponible
  slug,
  title,
  excerpt,
  content,
  meta_description,
  COALESCE(tags, ARRAY[]::text[]),
  COALESCE(published, false),
  COALESCE(reading_time, 5),
  COALESCE(faq, '[]'::jsonb),
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM blog_posts_backup_clean
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public can read published articles" ON blog_posts;
DROP POLICY IF EXISTS "Anon can insert articles" ON blog_posts;
DROP POLICY IF EXISTS "Anon can update articles" ON blog_posts;
DROP POLICY IF EXISTS "Anon can delete articles" ON blog_posts;

-- Recreate policies
CREATE POLICY "Public can read published articles"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anon can insert articles"
  ON blog_posts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update articles"
  ON blog_posts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete articles"
  ON blog_posts FOR DELETE
  TO anon
  USING (true);

-- Create indexes
DROP INDEX IF EXISTS idx_blog_posts_published;
DROP INDEX IF EXISTS idx_blog_posts_slug;
DROP INDEX IF EXISTS idx_blog_posts_created_at;

CREATE INDEX idx_blog_posts_published ON blog_posts(published);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- Force schema reload
NOTIFY pgrst, 'reload schema';
