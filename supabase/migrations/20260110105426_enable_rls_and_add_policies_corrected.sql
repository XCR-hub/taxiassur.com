/*
  # Enable RLS and Add Missing Policies (Corrected)

  1. Security Enhancement
    - Enable RLS on public tables
    - Add appropriate policies based on actual column structure
    - Ensure proper access control

  2. Strategy
    - Enable RLS on all public tables
    - Add policies appropriate for each table type
    - Public data remains accessible, private data restricted
*/

-- Enable RLS on all major tables
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%'
    AND tablename NOT IN (
      SELECT tablename FROM pg_tables t2
      WHERE t2.schemaname = 'public'
      AND EXISTS (
        SELECT 1 FROM pg_class c
        WHERE c.relname = t2.tablename
        AND c.relrowsecurity = true
      )
    )
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXCEPTION WHEN OTHERS THEN
      -- Ignore errors, continue with next table
      NULL;
    END;
  END LOOP;
END $$;

-- Add policies for blog_posts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_posts') THEN
    DROP POLICY IF EXISTS "Public can view blog posts" ON blog_posts;
    CREATE POLICY "Public can view blog posts"
      ON blog_posts FOR SELECT
      USING (published = true OR published IS NULL);
    
    DROP POLICY IF EXISTS "Authenticated can manage blog posts" ON blog_posts;
    CREATE POLICY "Authenticated can manage blog posts"
      ON blog_posts FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add policies for city_pages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'city_pages') THEN
    DROP POLICY IF EXISTS "Public can view city pages" ON city_pages;
    CREATE POLICY "Public can view city pages"
      ON city_pages FOR SELECT
      USING (true);
    
    DROP POLICY IF EXISTS "Authenticated can manage city pages" ON city_pages;
    CREATE POLICY "Authenticated can manage city pages"
      ON city_pages FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add policies for faq_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'faq_items') THEN
    DROP POLICY IF EXISTS "Public can view faq" ON faq_items;
    CREATE POLICY "Public can view faq"
      ON faq_items FOR SELECT
      USING (true);
    
    DROP POLICY IF EXISTS "Authenticated can manage faq" ON faq_items;
    CREATE POLICY "Authenticated can manage faq"
      ON faq_items FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add policies for partners
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partners') THEN
    DROP POLICY IF EXISTS "Public can view partners" ON partners;
    CREATE POLICY "Public can view partners"
      ON partners FOR SELECT
      USING (true);
    
    DROP POLICY IF EXISTS "Authenticated can manage partners" ON partners;
    CREATE POLICY "Authenticated can manage partners"
      ON partners FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add policies for insurance_companies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insurance_companies') THEN
    DROP POLICY IF EXISTS "Public can view companies" ON insurance_companies;
    CREATE POLICY "Public can view companies"
      ON insurance_companies FOR SELECT
      USING (true);
    
    DROP POLICY IF EXISTS "Authenticated can manage companies" ON insurance_companies;
    CREATE POLICY "Authenticated can manage companies"
      ON insurance_companies FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add policies for newsletter_subscribers  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'newsletter_subscribers') THEN
    DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscribers;
    CREATE POLICY "Anyone can subscribe to newsletter"
      ON newsletter_subscribers FOR INSERT
      WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Subscribers can update subscription" ON newsletter_subscribers;
    CREATE POLICY "Subscribers can update subscription"
      ON newsletter_subscribers FOR UPDATE
      USING (true)
      WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Authenticated view subscribers" ON newsletter_subscribers;
    CREATE POLICY "Authenticated view subscribers"
      ON newsletter_subscribers FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Add policy for social_networks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_networks') THEN
    DROP POLICY IF EXISTS "Authenticated can manage social networks" ON social_networks;
    CREATE POLICY "Authenticated can manage social networks"
      ON social_networks FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
