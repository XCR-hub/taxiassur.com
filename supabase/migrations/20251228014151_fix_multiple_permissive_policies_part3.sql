/*
  # Fix Security & Performance Issues - Part 5: Final RLS Policy Consolidation

  ## Changes
  
  Consolidates remaining multiple permissive policies.
*/

-- =====================================================
-- 1. FIX CONTENT_OPPORTUNITIES
-- =====================================================

DROP POLICY IF EXISTS "Allow anonymous read content_opportunities" ON public.content_opportunities;
DROP POLICY IF EXISTS "Allow public read access to content opportunities" ON public.content_opportunities;
DROP POLICY IF EXISTS "Allow authenticated full access to content_opportunities" ON public.content_opportunities;
DROP POLICY IF EXISTS "Authenticated users can manage content opportunities" ON public.content_opportunities;
DROP POLICY IF EXISTS "Allow anonymous insert content opportunities" ON public.content_opportunities;
DROP POLICY IF EXISTS "Allow anonymous update content opportunities" ON public.content_opportunities;

CREATE POLICY "Anyone can read content opportunities"
  ON public.content_opportunities
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage content opportunities"
  ON public.content_opportunities
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 2. FIX AI_IMPROVEMENT_LOG
-- =====================================================

DROP POLICY IF EXISTS "Authenticated write improvements" ON public.ai_improvement_log;
DROP POLICY IF EXISTS "Public read improvements" ON public.ai_improvement_log;

CREATE POLICY "Anyone can read improvements"
  ON public.ai_improvement_log
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can write improvements"
  ON public.ai_improvement_log
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 3. FIX AI_LEARNING_INSIGHTS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated write insights" ON public.ai_learning_insights;
DROP POLICY IF EXISTS "Public read insights" ON public.ai_learning_insights;

CREATE POLICY "Anyone can read insights"
  ON public.ai_learning_insights
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can write insights"
  ON public.ai_learning_insights
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 4. FIX AI_PATTERN_LIBRARY
-- =====================================================

DROP POLICY IF EXISTS "Authenticated write patterns" ON public.ai_pattern_library;
DROP POLICY IF EXISTS "Public read patterns" ON public.ai_pattern_library;

CREATE POLICY "Anyone can read patterns"
  ON public.ai_pattern_library
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can write patterns"
  ON public.ai_pattern_library
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 5. FIX AUTOMATION_CAMPAIGNS
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.automation_campaigns;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.automation_campaigns;

CREATE POLICY "Authenticated can manage campaigns"
  ON public.automation_campaigns
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 6. FIX AUTOMATION_CONFIG
-- =====================================================

DROP POLICY IF EXISTS "Authenticated manage automation config" ON public.automation_config;
DROP POLICY IF EXISTS "Public read automation config" ON public.automation_config;

CREATE POLICY "Anyone can read automation config"
  ON public.automation_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can write automation config"
  ON public.automation_config
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 7. FIX AUTOMATION_RULES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can manage rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Authenticated users can view rules" ON public.automation_rules;

CREATE POLICY "Authenticated can manage rules"
  ON public.automation_rules
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 8. FIX CRON_JOBS_CONFIG
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read cron jobs config" ON public.cron_jobs_config;
DROP POLICY IF EXISTS "Authenticated users can manage cron jobs" ON public.cron_jobs_config;

CREATE POLICY "Anyone can read cron config"
  ON public.cron_jobs_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage cron config"
  ON public.cron_jobs_config
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 9. FIX EMAIL_TEMPLATES
-- =====================================================

DROP POLICY IF EXISTS "Email templates readable by all" ON public.email_templates;
DROP POLICY IF EXISTS "Email templates writable by authenticated" ON public.email_templates;

CREATE POLICY "Anyone can read email templates"
  ON public.email_templates
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can write email templates"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 10. FIX FRENCH_CITIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read cities" ON public.french_cities;
DROP POLICY IF EXISTS "Authenticated users can modify cities" ON public.french_cities;

CREATE POLICY "Anyone can read cities"
  ON public.french_cities
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can modify cities"
  ON public.french_cities
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 11. FIX GDPR_DATA_REQUESTS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can manage DSR" ON public.gdpr_data_requests;
DROP POLICY IF EXISTS "Authenticated users can read DSR" ON public.gdpr_data_requests;

CREATE POLICY "Authenticated can manage DSR"
  ON public.gdpr_data_requests
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 12. FIX MARKETING_TEMPLATES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated write marketing_templates" ON public.marketing_templates;
DROP POLICY IF EXISTS "Public read marketing_templates" ON public.marketing_templates;

CREATE POLICY "Anyone can read marketing templates"
  ON public.marketing_templates
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can write marketing templates"
  ON public.marketing_templates
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 13. FIX NEWS_DIGEST
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read news digest" ON public.news_digest;
DROP POLICY IF EXISTS "Authenticated users can manage news digest" ON public.news_digest;

CREATE POLICY "Anyone can read digest"
  ON public.news_digest
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage digest"
  ON public.news_digest
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =====================================================
-- 14. FIX NEWS_SOURCES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read active news sources" ON public.news_sources;
DROP POLICY IF EXISTS "Authenticated users can manage news sources" ON public.news_sources;

CREATE POLICY "Anyone can read sources"
  ON public.news_sources
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true OR (SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated can manage sources"
  ON public.news_sources
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
