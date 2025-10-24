/*
  # Fix Content Opportunities RLS and Blog Posts

  1. Fix RLS policies for content_opportunities
  2. Fix blog_posts author_id type issue
*/

-- Fix content_opportunities RLS
DROP POLICY IF EXISTS "Allow authenticated insert" ON content_opportunities;
DROP POLICY IF EXISTS "Allow authenticated update" ON content_opportunities;
DROP POLICY IF EXISTS "Allow authenticated delete" ON content_opportunities;

-- Permettre insert/update/delete pour authenticated users
CREATE POLICY "Allow authenticated full access to content_opportunities"
  ON content_opportunities
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permettre aussi l'accès anonymous en lecture seule
CREATE POLICY "Allow anonymous read content_opportunities"
  ON content_opportunities
  FOR SELECT
  TO anon
  USING (true);

-- Fix blog_posts author_id (doit être TEXT ou NULL)
ALTER TABLE blog_posts
  ALTER COLUMN author_id TYPE TEXT USING COALESCE(author_id::TEXT, 'system');

-- Mettre une valeur par défaut
ALTER TABLE blog_posts
  ALTER COLUMN author_id SET DEFAULT 'system';

-- Notification
DO $$
BEGIN
  RAISE NOTICE '✅ RLS content_opportunities et blog_posts.author_id corrigés';
END $$;
