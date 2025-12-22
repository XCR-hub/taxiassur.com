/*
  # FIX ERREUR 401 - Version Nettoyée (sans doublons)

  PROBLÈME: Fonctions en double causent "function is not unique"
  SOLUTION: Supprimer TOUTES les versions puis recréer proprement

  Exécutez ce script dans Supabase SQL Editor !
*/

-- ============================================================================
-- ÉTAPE 1: SUPPRIMER TOUTES LES VERSIONS EXISTANTES
-- ============================================================================

-- Supprimer toutes les variantes de get_blog_posts
DROP FUNCTION IF EXISTS get_blog_posts() CASCADE;
DROP FUNCTION IF EXISTS get_blog_posts(integer) CASCADE;
DROP FUNCTION IF EXISTS get_blog_posts(text) CASCADE;

-- Supprimer toutes les variantes de get_blog_post_by_slug
DROP FUNCTION IF EXISTS get_blog_post_by_slug(text) CASCADE;
DROP FUNCTION IF EXISTS get_blog_post_by_slug(varchar) CASCADE;

-- Supprimer toutes les variantes de get_faq_entries
DROP FUNCTION IF EXISTS get_faq_entries() CASCADE;
DROP FUNCTION IF EXISTS get_faq_entries(integer) CASCADE;
DROP FUNCTION IF EXISTS get_faq_entries(text) CASCADE;

-- ============================================================================
-- ÉTAPE 2: CRÉER FONCTIONS PROPRES (UNE SEULE VERSION)
-- ============================================================================

-- Function 1: get_blog_posts() - Retourne tous les articles publiés
CREATE OR REPLACE FUNCTION get_blog_posts()
RETURNS TABLE(
  id uuid,
  slug text,
  title text,
  excerpt text,
  content text,
  author text,
  published boolean,
  featured_image text,
  meta_title text,
  meta_description text,
  keywords text[],
  read_time integer,
  views integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    bp.author,
    bp.published,
    bp.featured_image,
    bp.meta_title,
    bp.meta_description,
    bp.keywords,
    bp.read_time,
    bp.views,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE bp.published = true
  ORDER BY bp.created_at DESC;
END;
$$;

-- Function 2: get_blog_post_by_slug() - Retourne UN article par slug
CREATE OR REPLACE FUNCTION get_blog_post_by_slug(p_slug text)
RETURNS TABLE(
  id uuid,
  slug text,
  title text,
  excerpt text,
  content text,
  author text,
  published boolean,
  featured_image text,
  meta_title text,
  meta_description text,
  keywords text[],
  read_time integer,
  views integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    bp.author,
    bp.published,
    bp.featured_image,
    bp.meta_title,
    bp.meta_description,
    bp.keywords,
    bp.read_time,
    bp.views,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE bp.slug = p_slug
  AND bp.published = true
  LIMIT 1;
END;
$$;

-- Function 3: get_faq_entries() - Retourne toutes les FAQ
CREATE OR REPLACE FUNCTION get_faq_entries()
RETURNS TABLE(
  id uuid,
  question text,
  answer text,
  category text,
  order_index integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    faq.id,
    faq.question,
    faq.answer,
    faq.category,
    faq.order_index,
    faq.created_at,
    faq.updated_at
  FROM faq_entries faq
  ORDER BY faq.order_index ASC, faq.created_at DESC;
END;
$$;

-- ============================================================================
-- ÉTAPE 3: DONNER PERMISSIONS
-- ============================================================================

-- Permissions pour get_blog_posts()
GRANT EXECUTE ON FUNCTION get_blog_posts() TO anon;
GRANT EXECUTE ON FUNCTION get_blog_posts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_blog_posts() TO service_role;

-- Permissions pour get_blog_post_by_slug()
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(text) TO service_role;

-- Permissions pour get_faq_entries()
GRANT EXECUTE ON FUNCTION get_faq_entries() TO anon;
GRANT EXECUTE ON FUNCTION get_faq_entries() TO authenticated;
GRANT EXECUTE ON FUNCTION get_faq_entries() TO service_role;

-- ============================================================================
-- ÉTAPE 4: VÉRIFIER RLS POLICIES (si absentes)
-- ============================================================================

-- Blog Posts: Lecture publique
DO $$
BEGIN
  -- Vérifier si la policy existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_posts'
    AND policyname = 'Allow public read published posts'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read published posts"
      ON blog_posts FOR SELECT
      TO anon
      USING (published = true)';
  END IF;
END $$;

-- FAQ: Lecture publique
DO $$
BEGIN
  -- Vérifier si la policy existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'faq_entries'
    AND policyname = 'Allow public read FAQ'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read FAQ"
      ON faq_entries FOR SELECT
      TO anon
      USING (true)';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 5: TESTS DE VÉRIFICATION
-- ============================================================================

-- Test 1: Vérifier qu'il n'y a qu'UNE SEULE version de chaque fonction
SELECT
  routine_name,
  COUNT(*) as versions_count
FROM information_schema.routines
WHERE routine_name IN ('get_blog_posts', 'get_blog_post_by_slug', 'get_faq_entries')
AND routine_schema = 'public'
GROUP BY routine_name;

-- Résultat attendu: 3 lignes avec versions_count = 1 pour chaque

-- Test 2: Tester get_blog_posts()
SELECT COUNT(*) as total_articles FROM get_blog_posts();

-- Test 3: Tester get_faq_entries()
SELECT COUNT(*) as total_faqs FROM get_faq_entries();

-- Test 4: Afficher 3 articles
SELECT slug, title, created_at FROM get_blog_posts() LIMIT 3;

-- Test 5: Afficher 3 FAQ
SELECT question, category FROM get_faq_entries() LIMIT 3;

-- ============================================================================
-- ✅ RÉSULTAT ATTENDU
-- ============================================================================
--
-- Test 1: Doit afficher versions_count = 1 pour chaque fonction
-- Test 2: Doit afficher le nombre total d'articles (175+)
-- Test 3: Doit afficher le nombre total de FAQ (513+)
-- Test 4: Doit afficher 3 articles avec slug, titre, date
-- Test 5: Doit afficher 3 FAQ avec question et catégorie
--
-- Si tous les tests passent → SUCCESS ! Plus d'erreur 401
--
-- ============================================================================

-- COMMANDE FINALE : Lister toutes les fonctions créées
SELECT
  routine_name,
  routine_type,
  data_type,
  specific_name
FROM information_schema.routines
WHERE routine_name IN ('get_blog_posts', 'get_blog_post_by_slug', 'get_faq_entries')
AND routine_schema = 'public'
ORDER BY routine_name;
