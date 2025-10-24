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

-- Fix blog_posts author (doit être TEXT ou NULL)
-- Vérifier d'abord quelle colonne existe
DO $$
BEGIN
  -- Si author_id existe, la convertir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE blog_posts
      ALTER COLUMN author_id TYPE TEXT USING COALESCE(author_id::TEXT, 'system');

    ALTER TABLE blog_posts
      ALTER COLUMN author_id SET DEFAULT 'system';

    RAISE NOTICE '✅ Colonne author_id convertie en TEXT';
  END IF;

  -- Si author existe, la convertir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'author'
  ) THEN
    ALTER TABLE blog_posts
      ALTER COLUMN author TYPE TEXT USING COALESCE(author::TEXT, 'system');

    ALTER TABLE blog_posts
      ALTER COLUMN author SET DEFAULT 'system';

    RAISE NOTICE '✅ Colonne author convertie en TEXT';
  END IF;

  RAISE NOTICE '✅ RLS content_opportunities corrigé';
END $$;
