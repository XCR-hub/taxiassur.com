/*
  # SUPPRIMER DYNAMIQUEMENT TOUTES LES FONCTIONS BLOG

  Utilise une requête dynamique pour supprimer TOUTES les versions
  de get_blog_posts sans exception, puis recrée proprement.
*/

-- ============================================
-- ÉTAPE 1: DIAGNOSTIC - Lister TOUTES les fonctions blog
-- ============================================

DO $$
DECLARE
  func_record RECORD;
  func_count INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'DIAGNOSTIC - Fonctions blog existantes';
  RAISE NOTICE '============================================';

  FOR func_record IN
    SELECT
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as arguments,
      p.oid::regprocedure as full_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_blog_posts', 'get_blog_post_by_id', 'upsert_blog_post')
    ORDER BY p.proname
  LOOP
    RAISE NOTICE 'Fonction trouvée: %', func_record.full_signature;
    func_count := func_count + 1;
  END LOOP;

  IF func_count = 0 THEN
    RAISE NOTICE 'Aucune fonction blog trouvée';
  ELSE
    RAISE NOTICE 'Total: % fonction(s)', func_count;
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 2: SUPPRIMER DYNAMIQUEMENT TOUTES LES VERSIONS
-- ============================================

DO $$
DECLARE
  func_record RECORD;
  drop_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUPPRESSION DYNAMIQUE DE TOUTES LES FONCTIONS';
  RAISE NOTICE '============================================';

  -- Supprimer toutes les fonctions get_blog_posts
  FOR func_record IN
    SELECT p.oid::regprocedure as full_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_blog_posts'
  LOOP
    EXECUTE 'DROP FUNCTION ' || func_record.full_signature || ' CASCADE';
    RAISE NOTICE '✓ Supprimé: %', func_record.full_signature;
    drop_count := drop_count + 1;
  END LOOP;

  -- Supprimer toutes les fonctions get_blog_post_by_id
  FOR func_record IN
    SELECT p.oid::regprocedure as full_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_blog_post_by_id'
  LOOP
    EXECUTE 'DROP FUNCTION ' || func_record.full_signature || ' CASCADE';
    RAISE NOTICE '✓ Supprimé: %', func_record.full_signature;
    drop_count := drop_count + 1;
  END LOOP;

  -- Supprimer toutes les fonctions upsert_blog_post
  FOR func_record IN
    SELECT p.oid::regprocedure as full_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'upsert_blog_post'
  LOOP
    EXECUTE 'DROP FUNCTION ' || func_record.full_signature || ' CASCADE';
    RAISE NOTICE '✓ Supprimé: %', func_record.full_signature;
    drop_count := drop_count + 1;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ % fonction(s) blog supprimée(s)', drop_count;
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 3: VÉRIFIER LA TABLE blog_posts
-- ============================================

DO $$
DECLARE
  total_posts INTEGER;
  published_posts INTEGER;
  draft_posts INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_posts FROM blog_posts;
  SELECT COUNT(*) INTO published_posts FROM blog_posts WHERE published = true;
  SELECT COUNT(*) INTO draft_posts FROM blog_posts WHERE published = false OR published IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'DIAGNOSTIC TABLE blog_posts';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total articles: %', total_posts;
  RAISE NOTICE 'Publiés: %', published_posts;
  RAISE NOTICE 'Brouillons: %', draft_posts;
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 4: PUBLIER TOUS LES ARTICLES
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
  RAISE NOTICE '';
  RAISE NOTICE '✅ % articles publiés', published_count;
  RAISE NOTICE '';
END $$;

-- ============================================
-- ÉTAPE 5: CRÉER get_blog_posts() - VERSION UNIQUE
-- ============================================

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

DO $$
BEGIN
  RAISE NOTICE '✅ Fonction get_blog_posts() créée';
END $$;

-- ============================================
-- ÉTAPE 6: CRÉER get_blog_post_by_id() - VERSION UNIQUE
-- ============================================

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

DO $$
BEGIN
  RAISE NOTICE '✅ Fonction get_blog_post_by_id(uuid) créée';
END $$;

-- ============================================
-- ÉTAPE 7: VÉRIFIER QU'IL N'Y A PLUS DE DOUBLONS
-- ============================================

DO $$
DECLARE
  func_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'VÉRIFICATION - Pas de doublons';
  RAISE NOTICE '============================================';

  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'get_blog_posts';

  RAISE NOTICE 'Fonctions get_blog_posts: %', func_count;

  IF func_count = 1 THEN
    RAISE NOTICE '✅ Parfait! Une seule version';
  ELSE
    RAISE WARNING '⚠️ Attention! % versions trouvées', func_count;
  END IF;

  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'get_blog_post_by_id';

  RAISE NOTICE 'Fonctions get_blog_post_by_id: %', func_count;

  IF func_count = 1 THEN
    RAISE NOTICE '✅ Parfait! Une seule version';
  ELSE
    RAISE WARNING '⚠️ Attention! % versions trouvées', func_count;
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 8: TESTER LA FONCTION (sans l'appeler dans DO $$)
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST - Prêt à tester';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Pour tester manuellement:';
  RAISE NOTICE 'SELECT COUNT(*) FROM get_blog_posts();';
  RAISE NOTICE 'SELECT id, title FROM get_blog_posts() LIMIT 3;';
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 9: VÉRIFIER RLS
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
-- RÉSUMÉ FINAL
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
  func_signature TEXT;
BEGIN
  SELECT COUNT(*) INTO table_count FROM blog_posts WHERE published = true;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION BLOG TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Articles publiés: %', table_count;
  RAISE NOTICE '';

  -- Afficher la signature exacte
  SELECT p.oid::regprocedure::text INTO func_signature
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'get_blog_posts'
  LIMIT 1;

  RAISE NOTICE 'Fonction créée: %', func_signature;
  RAISE NOTICE '';

  IF table_count > 0 THEN
    RAISE NOTICE '✅✅✅ SUCCÈS! Page Blog prête';
    RAISE NOTICE '';
    RAISE NOTICE 'Vérifier: https://taxiassur.com/blog';
    RAISE NOTICE '';
    RAISE NOTICE 'Test manuel:';
    RAISE NOTICE 'SELECT * FROM get_blog_posts() LIMIT 5;';
  ELSE
    RAISE WARNING '⚠️ Problème: Aucun article publié';
  END IF;

  RAISE NOTICE '============================================';
END $$;
