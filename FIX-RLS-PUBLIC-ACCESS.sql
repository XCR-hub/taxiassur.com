/*
  # Fix RLS Policies for Public Read Access

  1. Changes
    - Add public read policies for blog_posts
    - Add public read policies for faq_entries
    - Add public read policies for analytics tables (for dashboard)
    - Add public read policies for automation_status
    - Keep write operations restricted to authenticated users
    
  2. Security
    - Public can READ all published content
    - Only authenticated users can INSERT/UPDATE/DELETE
*/

-- Blog Posts: Allow anonymous read
DROP POLICY IF EXISTS "Allow public read access to published posts" ON blog_posts;
CREATE POLICY "Allow public read access to published posts"
  ON blog_posts FOR SELECT
  TO anon
  USING (published = true);

DROP POLICY IF EXISTS "Allow authenticated read all posts" ON blog_posts;
CREATE POLICY "Allow authenticated read all posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (true);

-- FAQ Entries: Allow anonymous read
DROP POLICY IF EXISTS "Allow public read access to FAQ" ON faq_entries;
CREATE POLICY "Allow public read access to FAQ"
  ON faq_entries FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated read FAQ" ON faq_entries;
CREATE POLICY "Allow authenticated read FAQ"
  ON faq_entries FOR SELECT
  TO authenticated
  USING (true);

-- Automation Status: Allow anonymous read (for dashboard)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'automation_status') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow public read automation status" ON automation_status';
    EXECUTE 'CREATE POLICY "Allow public read automation status" ON automation_status FOR SELECT TO anon USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read automation status" ON automation_status';
    EXECUTE 'CREATE POLICY "Allow authenticated read automation status" ON automation_status FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- Analytics Sessions: Allow anonymous read (for dashboard stats)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_sessions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow public read analytics sessions" ON analytics_sessions';
    EXECUTE 'CREATE POLICY "Allow public read analytics sessions" ON analytics_sessions FOR SELECT TO anon USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read analytics sessions" ON analytics_sessions';
    EXECUTE 'CREATE POLICY "Allow authenticated read analytics sessions" ON analytics_sessions FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- Page Views: Allow anonymous read (for stats)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'page_views') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow public read page views" ON page_views';
    EXECUTE 'CREATE POLICY "Allow public read page views" ON page_views FOR SELECT TO anon USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read page views" ON page_views';
    EXECUTE 'CREATE POLICY "Allow authenticated read page views" ON page_views FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS get_realtime_stats();
DROP FUNCTION IF EXISTS get_top_pages_today();

-- Create RPC functions with SECURITY DEFINER for stats
CREATE OR REPLACE FUNCTION get_realtime_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if tables exist before querying
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_sessions') AND
     EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'page_views') THEN
    SELECT jsonb_build_object(
      'active_sessions', COALESCE((SELECT COUNT(*) FROM analytics_sessions WHERE ended_at IS NULL), 0),
      'total_views', COALESCE((SELECT COUNT(*) FROM page_views WHERE created_at > NOW() - INTERVAL '24 hours'), 0),
      'bounce_rate', COALESCE((SELECT AVG(bounce_rate) FROM analytics_sessions WHERE started_at > NOW() - INTERVAL '24 hours'), 0)
    ) INTO result;
  ELSE
    result := jsonb_build_object('active_sessions', 0, 'total_views', 0, 'bounce_rate', 0);
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_top_pages_today()
RETURNS TABLE(page_path text, view_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if table exists before querying
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'page_views') THEN
    RETURN QUERY
    SELECT
      pv.page_path::text,
      COUNT(*)::bigint as view_count
    FROM page_views pv
    WHERE pv.created_at > CURRENT_DATE
    GROUP BY pv.page_path
    ORDER BY view_count DESC
    LIMIT 10;
  ELSE
    RETURN;
  END IF;
END;
$$;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION get_realtime_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_realtime_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_pages_today() TO anon;
GRANT EXECUTE ON FUNCTION get_top_pages_today() TO authenticated;

-- ============================================================================
-- RPC FUNCTIONS FOR BLOG & FAQ (CRITICAL FOR FRONTEND)
-- ============================================================================

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS get_blog_posts();
DROP FUNCTION IF EXISTS get_blog_post_by_slug(text);
DROP FUNCTION IF EXISTS get_faq_entries();

-- Function to get all published blog posts
CREATE OR REPLACE FUNCTION get_blog_posts()
RETURNS TABLE(
  slug text,
  title text,
  excerpt text,
  content text,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz,
  faq jsonb
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
    bp.keywords as tags,
    bp.created_at,
    bp.updated_at,
    '[]'::jsonb as faq
  FROM blog_posts bp
  WHERE bp.published = true
  ORDER BY bp.created_at DESC;
END;
$$;

-- Function to get a single blog post by slug
CREATE OR REPLACE FUNCTION get_blog_post_by_slug(p_slug text)
RETURNS TABLE(
  slug text,
  title text,
  excerpt text,
  content text,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz,
  faq jsonb
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
    bp.keywords as tags,
    bp.created_at,
    bp.updated_at,
    '[]'::jsonb as faq
  FROM blog_posts bp
  WHERE bp.slug = p_slug
    AND bp.published = true
  LIMIT 1;
END;
$$;

-- Function to get all FAQ entries
CREATE OR REPLACE FUNCTION get_faq_entries()
RETURNS TABLE(
  id uuid,
  question text,
  answer text,
  category text,
  created_at timestamptz
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
    faq.created_at
  FROM faq_entries faq
  ORDER BY faq.order_index ASC, faq.created_at DESC;
END;
$$;

-- Grant execute permissions on blog/FAQ RPC functions
GRANT EXECUTE ON FUNCTION get_blog_posts() TO anon;
GRANT EXECUTE ON FUNCTION get_blog_posts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_faq_entries() TO anon;
GRANT EXECUTE ON FUNCTION get_faq_entries() TO authenticated;
