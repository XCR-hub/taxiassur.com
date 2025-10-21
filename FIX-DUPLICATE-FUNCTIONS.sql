-- Supprimer toutes les versions de get_blog_posts
DROP FUNCTION IF EXISTS get_blog_posts();
DROP FUNCTION IF EXISTS get_blog_posts(integer);
DROP FUNCTION IF EXISTS get_blog_posts(integer, integer);

-- Créer une seule version claire (CORRIGÉ: published au lieu de published_at)
CREATE OR REPLACE FUNCTION get_blog_posts(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  excerpt TEXT,
  content TEXT,
  author TEXT,
  published BOOLEAN,
  image_url TEXT,
  category TEXT,
  tags TEXT[],
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.content,
    bp.author,
    bp.published,
    bp.image_url,
    bp.category,
    bp.tags,
    bp.seo_title,
    bp.seo_description,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE bp.published = true
  ORDER BY bp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_blog_posts(INTEGER, INTEGER) TO anon, authenticated, service_role;

-- Test
SELECT id, title, published FROM get_blog_posts(5, 0);
