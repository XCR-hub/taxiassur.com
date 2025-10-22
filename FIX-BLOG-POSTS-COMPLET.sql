/*
  # FIX BLOG POSTS COMPLET

  Publier tous les articles et créer la fonction RPC
*/

-- ============================================
-- ÉTAPE 1: DIAGNOSTIC
-- ============================================

DO $$
DECLARE
  total_posts INTEGER;
  published_posts INTEGER;
  draft_posts INTEGER;
  col_record RECORD;
BEGIN
  SELECT COUNT(*) INTO total_posts FROM blog_posts;
  SELECT COUNT(*) INTO published_posts FROM blog_posts WHERE published = true;
  SELECT COUNT(*) INTO draft_posts FROM blog_posts WHERE published = false;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'DIAGNOSTIC BLOG';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total articles: %', total_posts;
  RAISE NOTICE 'Publiés: %', published_posts;
  RAISE NOTICE 'Brouillons: %', draft_posts;
  RAISE NOTICE '';
  RAISE NOTICE 'Structure table blog_posts:';

  FOR col_record IN
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'blog_posts'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '- % (%)', col_record.column_name, col_record.data_type;
  END LOOP;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 2: PUBLIER TOUS LES ARTICLES
-- ============================================

UPDATE blog_posts
SET
  published = true,
  updated_at = now()
WHERE published = false OR published IS NULL;

DO $$
DECLARE
  published_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO published_count FROM blog_posts WHERE published = true;
  RAISE NOTICE '✅ % articles publiés', published_count;
END $$;

-- ============================================
-- ÉTAPE 3: CRÉER LA FONCTION get_blog_posts
-- ============================================

DROP FUNCTION IF EXISTS get_blog_posts();

CREATE OR REPLACE FUNCTION get_blog_posts()
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  excerpt text,
  content text,
  cover_image text,
  featured_image text,
  tags text[],
  author text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.content,
    COALESCE(bp.cover_image, bp.featured_image) as cover_image,
    bp.featured_image,
    COALESCE(bp.tags, ARRAY[]::text[]) as tags,
    COALESCE(bp.author, 'TaxiAssur Expert') as author,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE bp.published = true
  ORDER BY bp.created_at DESC;
END;
$$;

-- ============================================
-- ÉTAPE 4: TESTER LA FONCTION
-- ============================================

DO $$
DECLARE
  func_count INTEGER;
  sample_record RECORD;
BEGIN
  SELECT COUNT(*) INTO func_count FROM get_blog_posts();

  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST FONCTION get_blog_posts()';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Articles retournés: %', func_count;

  IF func_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS! % articles disponibles', func_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Exemples d''articles:';

    FOR sample_record IN
      SELECT title, tags FROM get_blog_posts() LIMIT 3
    LOOP
      RAISE NOTICE '- % [Tags: %]', LEFT(sample_record.title, 60), array_to_string(sample_record.tags, ', ');
    END LOOP;
  ELSE
    RAISE WARNING '❌ Aucun article retourné';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 5: PERMISSIONS RLS
-- ============================================

DO $$
BEGIN
  -- Vérifier si la policy existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_posts'
    AND policyname = 'Allow anonymous read access'
  ) THEN
    CREATE POLICY "Allow anonymous read access"
      ON blog_posts
      FOR SELECT
      TO anon
      USING (published = true);
    RAISE NOTICE '✅ Policy anon créée pour blog_posts';
  ELSE
    RAISE NOTICE '✅ Policy anon existe déjà pour blog_posts';
  END IF;
END $$;

-- ============================================
-- ÉTAPE 6: CRÉER get_blog_post_by_id
-- ============================================

DROP FUNCTION IF EXISTS get_blog_post_by_id(uuid);

CREATE OR REPLACE FUNCTION get_blog_post_by_id(post_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  excerpt text,
  content text,
  cover_image text,
  featured_image text,
  tags text[],
  author text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.content,
    COALESCE(bp.cover_image, bp.featured_image) as cover_image,
    bp.featured_image,
    COALESCE(bp.tags, ARRAY[]::text[]) as tags,
    COALESCE(bp.author, 'TaxiAssur Expert') as author,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE bp.id = post_id
    AND bp.published = true;
END;
$$;

RAISE NOTICE '✅ Fonction get_blog_post_by_id créée';

-- ============================================
-- RÉSUMÉ FINAL
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count FROM blog_posts WHERE published = true;
  SELECT COUNT(*) INTO func_count FROM get_blog_posts();

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION BLOG TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Articles dans table: %', table_count;
  RAISE NOTICE 'Articles via fonction: %', func_count;
  RAISE NOTICE '';

  IF func_count > 0 THEN
    RAISE NOTICE '✅✅✅ SUCCÈS! Page Blog prête';
    RAISE NOTICE '';
    RAISE NOTICE 'Vérifier: https://taxiassur.com/blog';
  ELSE
    RAISE WARNING '⚠️ Problème: Vérifier les logs ci-dessus';
  END IF;

  RAISE NOTICE '============================================';
END $$;
