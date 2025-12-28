/*
  # Fix Security & Performance Issues - Part 4: More RLS Policy Consolidation

  ## Changes
  
  Continues consolidating multiple permissive policies for remaining tables.
*/

-- =====================================================
-- 1. FIX CITY_PAGES
-- =====================================================

DROP POLICY IF EXISTS "Allow anonymous insert city pages" ON public.city_pages;
DROP POLICY IF EXISTS "Allow anon read published city_pages" ON public.city_pages;
DROP POLICY IF EXISTS "Allow public read access to city pages" ON public.city_pages;
DROP POLICY IF EXISTS "Public can read published city pages" ON public.city_pages;
DROP POLICY IF EXISTS "Allow anonymous update city pages" ON public.city_pages;
DROP POLICY IF EXISTS "Allow authenticated all city_pages" ON public.city_pages;
DROP POLICY IF EXISTS "Authenticated can insert city pages" ON public.city_pages;
DROP POLICY IF EXISTS "Authenticated can read all city pages" ON public.city_pages;
DROP POLICY IF EXISTS "Authenticated can update city pages" ON public.city_pages;

CREATE POLICY "Anyone can read city pages"
  ON public.city_pages
  FOR SELECT
  TO anon, authenticated, authenticator, dashboard_user
  USING (true);

CREATE POLICY "Anyone can insert city pages"
  ON public.city_pages
  FOR INSERT
  TO anon, authenticated, authenticator, dashboard_user
  WITH CHECK (true);

CREATE POLICY "Anyone can update city pages"
  ON public.city_pages
  FOR UPDATE
  TO anon, authenticated, authenticator, dashboard_user
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete city pages"
  ON public.city_pages
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 2. FIX FAQ_ENTRIES
-- =====================================================

DROP POLICY IF EXISTS "Allow anon read published faq" ON public.faq_entries;
DROP POLICY IF EXISTS "Allow anonymous read access" ON public.faq_entries;
DROP POLICY IF EXISTS "Allow anonymous users to read FAQ" ON public.faq_entries;
DROP POLICY IF EXISTS "Allow public read access to faq entries" ON public.faq_entries;
DROP POLICY IF EXISTS "Public can read published FAQ" ON public.faq_entries;
DROP POLICY IF EXISTS "Allow anonymous insert faq entries" ON public.faq_entries;
DROP POLICY IF EXISTS "Allow authenticated all faq" ON public.faq_entries;
DROP POLICY IF EXISTS "Authenticated can insert FAQ" ON public.faq_entries;
DROP POLICY IF EXISTS "Allow authenticated users to read FAQ" ON public.faq_entries;
DROP POLICY IF EXISTS "Allow anonymous update faq entries" ON public.faq_entries;
DROP POLICY IF EXISTS "Authenticated can update FAQ" ON public.faq_entries;

CREATE POLICY "Anyone can read FAQ"
  ON public.faq_entries
  FOR SELECT
  TO anon, authenticated, authenticator, dashboard_user
  USING (true);

CREATE POLICY "Anyone can insert FAQ"
  ON public.faq_entries
  FOR INSERT
  TO anon, authenticated, authenticator, dashboard_user
  WITH CHECK (true);

CREATE POLICY "Anyone can update FAQ"
  ON public.faq_entries
  FOR UPDATE
  TO anon, authenticated, authenticator, dashboard_user
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete FAQ"
  ON public.faq_entries
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 3. FIX FAQ (old table)
-- =====================================================

DROP POLICY IF EXISTS "Allow anonymous read access" ON public.faq;
DROP POLICY IF EXISTS "Public read faq" ON public.faq;
DROP POLICY IF EXISTS "Authenticated can write faq" ON public.faq;

CREATE POLICY "Anyone can read old FAQ"
  ON public.faq
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can write old FAQ"
  ON public.faq
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 4. FIX FAQ_ITEMS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view all FAQs" ON public.faq_items;
DROP POLICY IF EXISTS "Public can view published FAQs" ON public.faq_items;

CREATE POLICY "Anyone can read FAQ items"
  ON public.faq_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage FAQ items"
  ON public.faq_items
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 5. FIX NEWS_ARTICLES
-- =====================================================

DROP POLICY IF EXISTS "Allow anonymous insert news articles" ON public.news_articles;
DROP POLICY IF EXISTS unified_news_anon_insert ON public.news_articles;
DROP POLICY IF EXISTS "Allow public read access to news articles" ON public.news_articles;
DROP POLICY IF EXISTS unified_news_public_select ON public.news_articles;
DROP POLICY IF EXISTS "Allow anonymous update news articles" ON public.news_articles;
DROP POLICY IF EXISTS unified_news_anon_update ON public.news_articles;

CREATE POLICY "Anyone can read news articles"
  ON public.news_articles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert news articles"
  ON public.news_articles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update news articles"
  ON public.news_articles
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete news articles"
  ON public.news_articles
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 6. FIX SOCIAL_POSTS
-- =====================================================

DROP POLICY IF EXISTS "Allow public read social posts" ON public.social_posts;
DROP POLICY IF EXISTS "Allow public read social_posts" ON public.social_posts;
DROP POLICY IF EXISTS "Allow authenticated delete social posts" ON public.social_posts;
DROP POLICY IF EXISTS "Allow authenticated delete social_posts" ON public.social_posts;
DROP POLICY IF EXISTS "Allow authenticated insert social_posts" ON public.social_posts;
DROP POLICY IF EXISTS "Allow authenticated write social posts" ON public.social_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.social_posts;
DROP POLICY IF EXISTS "Authenticated users can view all posts" ON public.social_posts;
DROP POLICY IF EXISTS "Allow authenticated update social posts" ON public.social_posts;
DROP POLICY IF EXISTS "Allow authenticated update social_posts" ON public.social_posts;
DROP POLICY IF EXISTS "Authenticated users can update their posts" ON public.social_posts;

CREATE POLICY "Anyone can read social posts"
  ON public.social_posts
  FOR SELECT
  TO anon, authenticated, authenticator, dashboard_user
  USING (true);

CREATE POLICY "Authenticated can insert social posts"
  ON public.social_posts
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated can update social posts"
  ON public.social_posts
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated can delete social posts"
  ON public.social_posts
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 7. FIX TAXI_PROSPECTS
-- =====================================================

DROP POLICY IF EXISTS "Allow public read" ON public.taxi_prospects;
DROP POLICY IF EXISTS "Allow public read access" ON public.taxi_prospects;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.taxi_prospects;
DROP POLICY IF EXISTS "Allow public insert" ON public.taxi_prospects;

CREATE POLICY "Anyone can read taxi prospects"
  ON public.taxi_prospects
  FOR SELECT
  TO anon, authenticated, authenticator, dashboard_user
  USING (true);

CREATE POLICY "Authenticated can insert taxi prospects"
  ON public.taxi_prospects
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated can update taxi prospects"
  ON public.taxi_prospects
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 8. FIX TESTIMONIALS
-- =====================================================

DROP POLICY IF EXISTS "Public can view approved testimonials" ON public.testimonials;

CREATE POLICY "Anyone can view approved testimonials"
  ON public.testimonials
  FOR SELECT
  TO anon, authenticated, authenticator, dashboard_user
  USING (status = 'approved' OR author_email = (SELECT auth.jwt()->>'email'));

CREATE POLICY "Authenticated can insert testimonials"
  ON public.testimonials
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
