-- Supprimer toutes les versions de get_blog_posts
DROP FUNCTION IF EXISTS get_blog_posts();
DROP FUNCTION IF EXISTS get_blog_posts(integer);
DROP FUNCTION IF EXISTS get_blog_posts(integer, integer);

-- Créer une seule version claire
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
  published_at TIMESTAMPTZ,
  image_url TEXT,
  category TEXT,
  tags TEXT[],
  seo_title TEXT,
  seo_description TEXT
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
    bp.published_at,
    bp.image_url,
    bp.category,
    bp.tags,
    bp.seo_title,
    bp.seo_description
  FROM blog_posts bp
  WHERE bp.published_at IS NOT NULL
  ORDER BY bp.published_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_blog_posts(INTEGER, INTEGER) TO anon, authenticated, service_role;

-- Test
SELECT id, title FROM get_blog_posts(5, 0);
