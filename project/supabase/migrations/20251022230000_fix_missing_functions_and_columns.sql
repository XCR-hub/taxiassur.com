/*
  # Fix Missing Functions and Columns

  1. Tables
    - Add missing columns to social_posts
    - Add missing columns to email_logs

  2. Functions
    - Create scrape_taxi_companies function
    - Create publish_to_social_media function
    - Create generate_blog_post_ai function

  3. Changes
    - social_posts: Add platform, content_type columns
    - email_logs: Add email_type column if missing
*/

-- ============================================================================
-- 1. FIX social_posts TABLE - Add missing columns
-- ============================================================================

DO $$
BEGIN
  -- Add platform column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_posts' AND column_name = 'platform'
  ) THEN
    ALTER TABLE social_posts ADD COLUMN platform text;
    COMMENT ON COLUMN social_posts.platform IS 'Platform: linkedin, pinterest, youtube, facebook, twitter';
  END IF;

  -- Add content_type column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_posts' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE social_posts ADD COLUMN content_type text DEFAULT 'post';
    COMMENT ON COLUMN social_posts.content_type IS 'Type: post, article, announcement, promotion';
  END IF;

  -- Add network column if missing (legacy)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_posts' AND column_name = 'network'
  ) THEN
    ALTER TABLE social_posts ADD COLUMN network text;
  END IF;
END $$;

-- ============================================================================
-- 2. FIX email_logs TABLE - Add missing columns
-- ============================================================================

DO $$
BEGIN
  -- Add email_type column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'email_type'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN email_type text;
    COMMENT ON COLUMN email_logs.email_type IS 'Type: welcome, outreach, followup, newsletter, test';
  END IF;

  -- Add subject column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'subject'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN subject text;
  END IF;

  -- Add status column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'status'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN status text DEFAULT 'pending';
    COMMENT ON COLUMN email_logs.status IS 'Status: pending, sent, failed, bounced';
  END IF;

  -- Add sent_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN sent_at timestamptz;
  END IF;

  -- Add error_message column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE email_logs ADD COLUMN error_message text;
  END IF;
END $$;

-- ============================================================================
-- 3. CREATE scrape_taxi_companies FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION scrape_taxi_companies(city_name text)
RETURNS TABLE (
  company_name text,
  phone text,
  email text,
  address text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Log the scraping attempt
  RAISE NOTICE 'Scraping taxi companies for city: %', city_name;

  -- Insert mock data for demonstration
  -- In production, this would call the Edge Function
  INSERT INTO taxi_prospects (company_name, city, phone, email, data_source, status)
  VALUES
    (city_name || ' Taxi Premium', city_name, '0612345678', 'contact@' || lower(city_name) || 'taxi.fr', 'google_places', 'pending'),
    (city_name || ' Taxi Express', city_name, '0698765432', 'info@' || lower(city_name) || 'express.fr', 'google_places', 'pending'),
    (city_name || ' Taxi Confort', city_name, '0687654321', 'contact@' || lower(city_name) || 'confort.fr', 'google_places', 'pending')
  ON CONFLICT (company_name, city) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '% new taxi companies added for %', v_count, city_name;

  -- Return the newly added companies
  RETURN QUERY
  SELECT
    tp.company_name,
    tp.phone,
    tp.email,
    tp.address
  FROM taxi_prospects tp
  WHERE tp.city = city_name
  ORDER BY tp.created_at DESC
  LIMIT 10;
END;
$$;

COMMENT ON FUNCTION scrape_taxi_companies IS 'Scrape taxi companies for a given city (demo version with mock data)';

-- ============================================================================
-- 4. CREATE publish_to_social_media FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION publish_to_social_media(
  p_platform text,
  p_content text,
  p_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_id uuid;
  v_title text;
BEGIN
  -- Extract title from content (first 50 chars)
  v_title := substring(p_content from 1 for 50) || '...';

  -- Insert the social post
  INSERT INTO social_posts (
    platform,
    network,
    content_type,
    title,
    content,
    status,
    scheduled_for
  ) VALUES (
    p_platform,
    p_platform, -- Legacy compatibility
    'post',
    v_title,
    p_content || CASE WHEN p_url IS NOT NULL THEN E'\n\n' || p_url ELSE '' END,
    'scheduled',
    now() + interval '5 minutes'
  )
  RETURNING id INTO v_post_id;

  RAISE NOTICE 'Social post created for % with ID: %', p_platform, v_post_id;

  RETURN v_post_id;
END;
$$;

COMMENT ON FUNCTION publish_to_social_media IS 'Schedule a post to be published on social media';

-- ============================================================================
-- 5. CREATE generate_blog_post_ai FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_blog_post_ai(
  p_title text,
  p_category text DEFAULT 'blog',
  p_tags text[] DEFAULT ARRAY[]::text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_id uuid;
  v_slug text;
  v_content text;
BEGIN
  -- Generate slug from title
  v_slug := lower(regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);

  -- Generate demo content
  v_content := '# ' || p_title || E'\n\n' ||
               'Cet article a été généré automatiquement par notre système IA.' || E'\n\n' ||
               '## Introduction' || E'\n\n' ||
               'Découvrez tout ce que vous devez savoir sur ce sujet important.' || E'\n\n' ||
               '## Points Clés' || E'\n\n' ||
               '- Point important 1' || E'\n' ||
               '- Point important 2' || E'\n' ||
               '- Point important 3' || E'\n\n' ||
               '## Conclusion' || E'\n\n' ||
               'En conclusion, ce sujet mérite toute votre attention.';

  -- Insert blog post
  INSERT INTO blog_posts (
    title,
    slug,
    content,
    excerpt,
    category,
    tags,
    author,
    published,
    published_at
  ) VALUES (
    p_title,
    v_slug,
    v_content,
    'Article généré automatiquement par IA',
    p_category,
    p_tags,
    'IA TaxiAssur',
    true,
    now()
  )
  RETURNING id INTO v_post_id;

  RAISE NOTICE 'Blog post generated with ID: %', v_post_id;

  RETURN v_post_id;
END;
$$;

COMMENT ON FUNCTION generate_blog_post_ai IS 'Generate a blog post using AI (demo version)';

-- ============================================================================
-- 6. CREATE INDEXES for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_taxi_prospects_city ON taxi_prospects(city);
CREATE INDEX IF NOT EXISTS idx_taxi_prospects_status ON taxi_prospects(status);

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION scrape_taxi_companies TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION publish_to_social_media TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION generate_blog_post_ai TO authenticated, anon, service_role;

-- ============================================================================
-- 8. SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - scrape_taxi_companies(city_name)';
  RAISE NOTICE '  - publish_to_social_media(platform, content, url)';
  RAISE NOTICE '  - generate_blog_post_ai(title, category, tags)';
  RAISE NOTICE '';
  RAISE NOTICE 'Columns added:';
  RAISE NOTICE '  - social_posts: platform, content_type';
  RAISE NOTICE '  - email_logs: email_type, subject, status, sent_at';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now test with:';
  RAISE NOTICE '  SELECT scrape_taxi_companies(''Paris'');';
  RAISE NOTICE '  SELECT publish_to_social_media(''linkedin'', ''Test post'', ''https://taxiassur.com'');';
  RAISE NOTICE '';
END $$;
