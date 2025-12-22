/*
  # Recreate blog_posts functions properly
  
  Drop and recreate all functions to match the current schema
*/

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS get_blog_posts() CASCADE;
DROP FUNCTION IF EXISTS get_blog_post_by_slug(text) CASCADE;
DROP FUNCTION IF EXISTS upsert_blog_post(text, text, text, text, text, text, text[], boolean, integer, jsonb) CASCADE;

-- Function: Get all published blog posts
CREATE FUNCTION get_blog_posts()
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
CREATE FUNCTION get_blog_post_by_slug(p_slug text)
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

-- Function: Upsert blog post (using IF EXISTS logic)
CREATE FUNCTION upsert_blog_post(
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
  result_id text,
  result_slug text,
  result_title text,
  result_published boolean,
  result_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Check if record exists
  SELECT EXISTS(SELECT 1 FROM blog_posts WHERE blog_posts.id = p_id) INTO v_exists;
  
  IF v_exists THEN
    -- Update existing record
    UPDATE blog_posts SET
      slug = p_slug,
      title = p_title,
      excerpt = p_excerpt,
      content = p_content,
      meta_description = p_meta_description,
      tags = p_tags,
      published = p_published,
      reading_time = p_reading_time,
      faq = p_faq,
      updated_at = now()
    WHERE blog_posts.id = p_id;
  ELSE
    -- Insert new record
    INSERT INTO blog_posts (
      id, slug, title, excerpt, content, meta_description,
      tags, published, reading_time, faq, created_at, updated_at
    ) VALUES (
      p_id, p_slug, p_title, p_excerpt, p_content, p_meta_description,
      p_tags, p_published, p_reading_time, p_faq, now(), now()
    );
  END IF;
  
  -- Return the record
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
