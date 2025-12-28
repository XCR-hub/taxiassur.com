/*
  # Fix Security & Performance Issues - Part 3: Simplify Multiple Permissive Policies

  ## Changes
  
  ### 1. Consolidate Multiple Permissive Policies
  Merge multiple permissive policies into single comprehensive policies.
  This improves security and performance.
*/

-- =====================================================
-- 1. FIX AUTOMATION_STATUS
-- =====================================================

DROP POLICY IF EXISTS "Allow public read automation_status" ON public.automation_status;
DROP POLICY IF EXISTS "Allow public write automation_status" ON public.automation_status;

CREATE POLICY "Anyone can read automation status"
  ON public.automation_status
  FOR SELECT
  TO anon, authenticated, authenticator, dashboard_user
  USING (true);

CREATE POLICY "Authenticated can write automation status"
  ON public.automation_status
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 2. FIX BACKLINK_CAMPAIGNS
-- =====================================================

DROP POLICY IF EXISTS "Allow read for all" ON public.backlink_campaigns;
DROP POLICY IF EXISTS "Public can view campaigns" ON public.backlink_campaigns;
DROP POLICY IF EXISTS "Allow authenticated write" ON public.backlink_campaigns;
DROP POLICY IF EXISTS "Authenticated can manage campaigns" ON public.backlink_campaigns;

CREATE POLICY "Anyone can read campaigns"
  ON public.backlink_campaigns
  FOR SELECT
  TO anon, authenticated, authenticator, dashboard_user
  USING (true);

CREATE POLICY "Authenticated can manage campaigns"
  ON public.backlink_campaigns
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 3. FIX BACKLINK_NOTIFICATIONS
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated write notifications" ON public.backlink_notifications;
DROP POLICY IF EXISTS "Allow read notifications" ON public.backlink_notifications;

CREATE POLICY "Authenticated can read notifications"
  ON public.backlink_notifications
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated can write notifications"
  ON public.backlink_notifications
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 4. FIX BACKLINK_OPPORTUNITIES
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated all backlink_opportunities" ON public.backlink_opportunities;
DROP POLICY IF EXISTS "Allow authenticated to manage backlink opportunities" ON public.backlink_opportunities;
DROP POLICY IF EXISTS "Allow anon to read backlink opportunities" ON public.backlink_opportunities;

CREATE POLICY "Anyone can read backlink opportunities"
  ON public.backlink_opportunities
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage backlink opportunities"
  ON public.backlink_opportunities
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 5. FIX BACKLINK_OUTREACH
-- =====================================================

DROP POLICY IF EXISTS "Backlink outreach readable by all" ON public.backlink_outreach;
DROP POLICY IF EXISTS "Backlink outreach writable by authenticated" ON public.backlink_outreach;

CREATE POLICY "Anyone can read outreach"
  ON public.backlink_outreach
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can write outreach"
  ON public.backlink_outreach
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 6. FIX BACKLINK_OUTREACH_LOG
-- =====================================================

DROP POLICY IF EXISTS "Allow anon to read backlink outreach log" ON public.backlink_outreach_log;
DROP POLICY IF EXISTS "Public can view outreach logs" ON public.backlink_outreach_log;
DROP POLICY IF EXISTS "Allow authenticated to manage backlink outreach log" ON public.backlink_outreach_log;
DROP POLICY IF EXISTS "Authenticated can manage outreach logs" ON public.backlink_outreach_log;

CREATE POLICY "Anyone can read outreach logs"
  ON public.backlink_outreach_log
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage outreach logs"
  ON public.backlink_outreach_log
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 7. FIX BACKLINK_SCAN_HISTORY
-- =====================================================

DROP POLICY IF EXISTS "Scan history readable by all" ON public.backlink_scan_history;
DROP POLICY IF EXISTS "Scan history writable by service" ON public.backlink_scan_history;
DROP POLICY IF EXISTS "Admin can manage backlink_scan_history" ON public.backlink_scan_history;

CREATE POLICY "Anyone can read scan history"
  ON public.backlink_scan_history
  FOR SELECT
  TO anon, authenticated, authenticator, dashboard_user
  USING (true);

CREATE POLICY "Authenticated can manage scan history"
  ON public.backlink_scan_history
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 8. FIX BACKLINK_WORKFLOW_STEPS
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated write workflow" ON public.backlink_workflow_steps;
DROP POLICY IF EXISTS "Allow read workflow" ON public.backlink_workflow_steps;

CREATE POLICY "Authenticated can read workflow"
  ON public.backlink_workflow_steps
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated can write workflow"
  ON public.backlink_workflow_steps
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 9. FIX BLOG_POSTS
-- =====================================================

DROP POLICY IF EXISTS "Allow anonymous insert blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow anon read published blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow anonymous read access" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow public read access to published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Public can view published posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow anonymous update blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow authenticated all blog_posts" ON public.blog_posts;

CREATE POLICY "Anyone can read published blog posts"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated, authenticator, dashboard_user
  USING (published = true OR (SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Anyone can insert blog posts"
  ON public.blog_posts
  FOR INSERT
  TO anon, authenticated, authenticator, dashboard_user
  WITH CHECK (true);

CREATE POLICY "Anyone can update blog posts"
  ON public.blog_posts
  FOR UPDATE
  TO anon, authenticated, authenticator, dashboard_user
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete blog posts"
  ON public.blog_posts
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
