/*
  # Fix Security & Performance Issues - Part 6: Final Multiple Policies

  ## Changes
  
  Consolidates the last remaining multiple permissive policies.
*/

-- =====================================================
-- 1. FIX PARTNER_OUTREACH_TEMPLATES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can manage templates" ON public.partner_outreach_templates;
DROP POLICY IF EXISTS "Authenticated users can read templates" ON public.partner_outreach_templates;

CREATE POLICY "Authenticated can manage templates"
  ON public.partner_outreach_templates
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 2. FIX PARTNER_PROSPECTS
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated all partner_prospects" ON public.partner_prospects;
DROP POLICY IF EXISTS "Allow public insert partner_prospects" ON public.partner_prospects;
DROP POLICY IF EXISTS "Allow public read partner_prospects" ON public.partner_prospects;
DROP POLICY IF EXISTS "Allow authenticated update partner_prospects" ON public.partner_prospects;
DROP POLICY IF EXISTS "Allow authenticated delete partner_prospects" ON public.partner_prospects;

CREATE POLICY "Anyone can read partner prospects"
  ON public.partner_prospects
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage partner prospects"
  ON public.partner_prospects
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 3. FIX PINTEREST_PERFORMANCE_TRACKING
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated manage pinterest performance" ON public.pinterest_performance_tracking;
DROP POLICY IF EXISTS "Allow public read pinterest performance" ON public.pinterest_performance_tracking;

CREATE POLICY "Anyone can read pinterest performance"
  ON public.pinterest_performance_tracking
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage pinterest performance"
  ON public.pinterest_performance_tracking
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 4. FIX POST_GENERATION_LOGS
-- =====================================================

DROP POLICY IF EXISTS "Allow anon insert logs" ON public.post_generation_logs;
DROP POLICY IF EXISTS "System can insert generation logs" ON public.post_generation_logs;
DROP POLICY IF EXISTS "Allow anon read logs" ON public.post_generation_logs;
DROP POLICY IF EXISTS "Authenticated users can view generation logs" ON public.post_generation_logs;

CREATE POLICY "Anyone can read logs"
  ON public.post_generation_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert logs"
  ON public.post_generation_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can manage logs"
  ON public.post_generation_logs
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 5. FIX SOCIAL_NETWORKS
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated users to insert social networks" ON public.social_networks;
DROP POLICY IF EXISTS "Authenticated users can manage social networks" ON public.social_networks;
DROP POLICY IF EXISTS "Allow authenticated users to read social networks" ON public.social_networks;
DROP POLICY IF EXISTS "Anyone can view social networks" ON public.social_networks;
DROP POLICY IF EXISTS "Allow authenticated users to update social networks" ON public.social_networks;

CREATE POLICY "Anyone can read social networks"
  ON public.social_networks
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage social networks"
  ON public.social_networks
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 6. FIX SOCIAL_POST_ANALYTICS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated write access" ON public.social_post_analytics;
DROP POLICY IF EXISTS "Public read access" ON public.social_post_analytics;

CREATE POLICY "Anyone can read analytics"
  ON public.social_post_analytics
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can write analytics"
  ON public.social_post_analytics
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 7. FIX VIRAL_CONTENT_TEMPLATES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view viral templates" ON public.viral_content_templates;
DROP POLICY IF EXISTS "Authenticated users can manage templates" ON public.viral_content_templates;

CREATE POLICY "Anyone can read viral templates"
  ON public.viral_content_templates
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage viral templates"
  ON public.viral_content_templates
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 8. FIX VIRAL_TEMPLATES
-- =====================================================

DROP POLICY IF EXISTS "Allow anon read active templates" ON public.viral_templates;
DROP POLICY IF EXISTS "Allow authenticated write templates" ON public.viral_templates;

CREATE POLICY "Anyone can read active templates"
  ON public.viral_templates
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR (SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated can write templates"
  ON public.viral_templates
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 9. FIX WHATSAPP_GROUPS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can manage groups" ON public.whatsapp_groups;
DROP POLICY IF EXISTS "Authenticated users can view groups" ON public.whatsapp_groups;

CREATE POLICY "Authenticated can manage whatsapp groups"
  ON public.whatsapp_groups
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
