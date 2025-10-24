/*
  # Create SQL functions for blog_posts management
  
  This bypasses PostgREST cache issues by using direct SQL functions
  
  Functions:
  1. get_blog_posts() - Get all published articles
  2. get_blog_post_by_slug(slug) - Get one article by slug
  3. upsert_blog_post(...) - Insert or update article
*/

-- Function: Get all published blog posts
CREATE OR REPLACE FUNCTION get_blog_posts()
RETURNS TABLE (
  id text,
  slug text,
  title text,
  excerpt text,
  content text,
  meta_description text,
  tags text[],
  published boolean,
  reading_time integer,
  faq jsonb,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    slug,
    title,
    excerpt,
    content,
    meta_description,
    tags,
    published,
    reading_time,
    faq,
    created_at,
    updated_at
  FROM blog_posts
  WHERE published = true
  ORDER BY created_at DESC;
$$;

-- Function: Get one blog post by slug
CREATE OR REPLACE FUNCTION get_blog_post_by_slug(p_slug text)
RETURNS TABLE (
  id text,
  slug text,
  title text,
  excerpt text,
  content text,
  meta_description text,
  tags text[],
  published boolean,
  reading_time integer,
  faq jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    slug,
    title,
    excerpt,
    content,
    meta_description,
    tags,
    published,
    reading_time,
    faq,
    created_at,
    updated_at
  FROM blog_posts
  WHERE slug = p_slug AND published = true
  LIMIT 1;
$$;

-- Function: Upsert blog post (insert or update)
CREATE OR REPLACE FUNCTION upsert_blog_post(
  p_id text,
  p_slug text,
  p_title text,
  p_excerpt text,
  p_content text,
  p_meta_description text DEFAULT NULL,
  p_tags text[] DEFAULT ARRAY[]::text[],
  p_published boolean DEFAULT false,
  p_reading_time integer DEFAULT 5,
  p_faq jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  id text,
  slug text,
  title text,
  published boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update using ON CONFLICT
  INSERT INTO blog_posts (
    id,
    slug,
    title,
    excerpt,
    content,
    meta_description,
    tags,
    published,
    reading_time,
    faq,
    created_at,
    updated_at
  ) VALUES (
    p_id,
    p_slug,
    p_title,
    p_excerpt,
    p_content,
    p_meta_description,
    p_tags,
    p_published,
    p_reading_time,
    p_faq,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    meta_description = EXCLUDED.meta_description,
    tags = EXCLUDED.tags,
    published = EXCLUDED.published,
    reading_time = EXCLUDED.reading_time,
    faq = EXCLUDED.faq,
    updated_at = now();
  
  -- Return the inserted/updated row
  RETURN QUERY
  SELECT 
    bp.id,
    bp.slug,
    bp.title,
    bp.published,
    bp.created_at
  FROM blog_posts bp
  WHERE bp.id = p_id;
END;
$$;

-- Grant execute permissions to anon and authenticated
GRANT EXECUTE ON FUNCTION get_blog_posts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_blog_post(text, text, text, text, text, text, text[], boolean, integer, jsonb) TO anon, authenticated;
