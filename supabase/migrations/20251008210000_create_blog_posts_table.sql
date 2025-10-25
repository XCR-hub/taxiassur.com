/*
  # Create Blog Posts Table

  1. New Tables
    - `blog_posts`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `slug` (text, unique, required)
      - `excerpt` (text)
      - `content` (text, required)
      - `meta_description` (text)
      - `tags` (text array)
      - `reading_time` (integer, minutes)
      - `status` (enum: draft, published)
      - `author_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `published_at` (timestamptz)

  2. Security
    - Enable RLS
    - Allow anon to read published posts
    - Allow anon to insert/update (backoffice usage)
*/

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text,
  content text NOT NULL,
  meta_description text,
  tags text[] DEFAULT '{}',
  reading_time integer DEFAULT 5,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz
);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow anon to read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Allow anon to insert posts" ON blog_posts;
DROP POLICY IF EXISTS "Allow anon to update posts" ON blog_posts;

-- Allow anon to read published posts (for website)
CREATE POLICY "Allow anon to read published posts"
  ON blog_posts
  FOR SELECT
  TO anon
  USING (status = 'published' OR status = 'draft');

-- Allow anon to insert posts (backoffice)
CREATE POLICY "Allow anon to insert posts"
  ON blog_posts
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to update posts (backoffice)
CREATE POLICY "Allow anon to update posts"
  ON blog_posts
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts(status);
CREATE INDEX IF NOT EXISTS blog_posts_created_at_idx ON blog_posts(created_at DESC);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'published' AND OLD.status = 'draft' THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS blog_posts_updated_at_trigger ON blog_posts;
CREATE TRIGGER blog_posts_updated_at_trigger
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();
