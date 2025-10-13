/*
  # FIX ERREUR 401 - Création Fonctions RPC Manquantes

  PROBLÈME: Les fonctions get_blog_posts() et get_faq_entries() n'existent pas
  SOLUTION: Créer ces fonctions avec SECURITY DEFINER

  Exécutez ce script dans Supabase SQL Editor MAINTENANT !
*/

-- ============================================================================
-- 1. CRÉER FONCTION get_blog_posts()
-- ============================================================================

DROP FUNCTION IF EXISTS get_blog_posts();

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

-- Permissions
GRANT EXECUTE ON FUNCTION get_blog_posts() TO anon;
GRANT EXECUTE ON FUNCTION get_blog_posts() TO authenticated;

-- ============================================================================
-- 2. CRÉER FONCTION get_blog_post_by_slug()
-- ============================================================================

DROP FUNCTION IF EXISTS get_blog_post_by_slug(text);

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
  AND bp.published = true;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(text) TO authenticated;

-- ============================================================================
-- 3. CRÉER FONCTION get_faq_entries()
-- ============================================================================

DROP FUNCTION IF EXISTS get_faq_entries();

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

-- Permissions
GRANT EXECUTE ON FUNCTION get_faq_entries() TO anon;
GRANT EXECUTE ON FUNCTION get_faq_entries() TO authenticated;

-- ============================================================================
-- 4. VÉRIFIER LES RLS POLICIES
-- ============================================================================

-- Blog Posts: Lecture publique pour contenus publiés
DROP POLICY IF EXISTS "Allow public read published posts" ON blog_posts;
CREATE POLICY "Allow public read published posts"
  ON blog_posts FOR SELECT
  TO anon
  USING (published = true);

-- FAQ: Lecture publique
DROP POLICY IF EXISTS "Allow public read FAQ" ON faq_entries;
CREATE POLICY "Allow public read FAQ"
  ON faq_entries FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- 5. TEST DES FONCTIONS
-- ============================================================================

-- Test 1: Vérifier blog_posts
SELECT * FROM get_blog_posts() LIMIT 5;

-- Test 2: Vérifier FAQ
SELECT * FROM get_faq_entries() LIMIT 5;

-- Test 3: Compter les articles
SELECT COUNT(*) as total_articles FROM get_blog_posts();

-- Test 4: Compter les FAQ
SELECT COUNT(*) as total_faqs FROM get_faq_entries();

-- ============================================================================
-- ✅ RÉSULTAT ATTENDU
-- ============================================================================
--
-- Si tout fonctionne :
-- - Test 1 : Affiche 5 articles maximum
-- - Test 2 : Affiche 5 FAQ maximum
-- - Test 3 : Affiche le nombre total d'articles (175)
-- - Test 4 : Affiche le nombre total de FAQ (513)
--
-- Si vous voyez ces résultats → SUCCESS ! L'erreur 401 est corrigée.
--
-- Ensuite :
-- 1. Rafraîchir https://taxiassur.com/blog
-- 2. Rafraîchir https://taxiassur.com/faq
-- 3. Plus d'erreur 401 !
--
-- ============================================================================
