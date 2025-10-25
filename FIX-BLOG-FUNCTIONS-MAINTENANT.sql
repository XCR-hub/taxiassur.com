/*
  # FIX: Fonctions RPC Blog Posts

  Crée ou recrée les fonctions nécessaires pour afficher les articles de blog.

  ## Fonctions créées:
  1. get_blog_posts() - Retourne tous les articles publiés
  2. get_blog_post_by_slug(slug) - Retourne un article spécifique par son slug

  ## Test après exécution:
  ```sql
  -- Test 1: Liste articles
  SELECT slug, title FROM get_blog_posts() LIMIT 5;

  -- Test 2: Article spécifique
  SELECT * FROM get_blog_post_by_slug('assurance-taxi-2024');
  ```
*/

-- ===================================================================
-- ÉTAPE 1: Nettoyer les anciennes versions
-- ===================================================================

DROP FUNCTION IF EXISTS get_blog_posts() CASCADE;
DROP FUNCTION IF EXISTS get_blog_posts(integer) CASCADE;
DROP FUNCTION IF EXISTS get_blog_posts(integer, integer) CASCADE;
DROP FUNCTION IF EXISTS get_blog_post_by_slug(text) CASCADE;

-- ===================================================================
-- ÉTAPE 2: Créer get_blog_posts() - Liste tous les articles
-- ===================================================================

CREATE OR REPLACE FUNCTION get_blog_posts()
RETURNS TABLE (
  slug TEXT,
  title TEXT,
  excerpt TEXT,
  content TEXT,
  author TEXT,
  featured_image TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  faq JSONB,
  published BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    COALESCE(bp.author, 'TaxiAssur') as author,
    bp.featured_image,
    COALESCE(bp.tags, ARRAY[]::TEXT[]) as tags,
    bp.created_at,
    COALESCE(bp.updated_at, bp.created_at) as updated_at,
    COALESCE(bp.faq, '[]'::JSONB) as faq,
    bp.published
  FROM blog_posts bp
  WHERE bp.published = true
  ORDER BY bp.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_blog_posts IS 'Retourne tous les articles de blog publiés triés par date décroissante';

-- ===================================================================
-- ÉTAPE 3: Créer get_blog_post_by_slug() - Article spécifique
-- ===================================================================

CREATE OR REPLACE FUNCTION get_blog_post_by_slug(p_slug TEXT)
RETURNS TABLE (
  slug TEXT,
  title TEXT,
  excerpt TEXT,
  content TEXT,
  author TEXT,
  featured_image TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  faq JSONB,
  published BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    COALESCE(bp.author, 'TaxiAssur') as author,
    bp.featured_image,
    COALESCE(bp.tags, ARRAY[]::TEXT[]) as tags,
    bp.created_at,
    COALESCE(bp.updated_at, bp.created_at) as updated_at,
    COALESCE(bp.faq, '[]'::JSONB) as faq,
    bp.published
  FROM blog_posts bp
  WHERE bp.slug = p_slug
    AND bp.published = true;
END;
$$;

COMMENT ON FUNCTION get_blog_post_by_slug IS 'Retourne un article de blog spécifique par son slug';

-- ===================================================================
-- ÉTAPE 4: Donner les permissions
-- ===================================================================

GRANT EXECUTE ON FUNCTION get_blog_posts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(TEXT) TO anon, authenticated;

-- ===================================================================
-- ÉTAPE 5: Vérifier que les fonctions existent
-- ===================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Compter les fonctions créées
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('get_blog_posts', 'get_blog_post_by_slug');

  IF v_count = 2 THEN
    RAISE NOTICE '✅ Les 2 fonctions RPC blog ont été créées avec succès';
  ELSE
    RAISE EXCEPTION '❌ Erreur: Seulement % fonctions créées sur 2 attendues', v_count;
  END IF;

  -- Afficher les signatures
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  - get_blog_posts() → retourne tous les articles';
  RAISE NOTICE '  - get_blog_post_by_slug(slug) → retourne un article spécifique';
END $$;

-- ===================================================================
-- ÉTAPE 6: Test rapide (optionnel - décommenter pour tester)
-- ===================================================================

-- Test 1: Combien d'articles publiés?
SELECT
  COUNT(*) as total_articles_publies,
  COUNT(*) FILTER (WHERE featured_image IS NOT NULL) as avec_image
FROM get_blog_posts();

-- Test 2: Afficher les 3 premiers slugs
SELECT slug, title, LEFT(excerpt, 50) as excerpt_preview
FROM get_blog_posts()
LIMIT 3;

-- ===================================================================
-- FIN DE LA MIGRATION
-- ===================================================================

-- Instructions: Après avoir exécuté cette migration
-- 1. Vérifier: SELECT * FROM get_blog_posts() LIMIT 3;
-- 2. Tester un article: SELECT * FROM get_blog_post_by_slug('assurance-taxi-2024');
-- 3. Recharger la page /blog avec Ctrl+Shift+R
-- 4. Cliquer sur un article → devrait maintenant fonctionner ✅
