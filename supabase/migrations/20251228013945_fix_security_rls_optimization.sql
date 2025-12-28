/*
  # Fix Security & Performance Issues - Part 2: RLS Optimization

  ## Changes
  
  ### 1. Optimize RLS Policies
  Replace auth.uid() with (SELECT auth.uid()) in all policies for better performance.
  
  ### 2. Add Missing RLS Policies
  Add policies to tables that have RLS enabled but no policies.
*/

-- =====================================================
-- 1. OPTIMIZE RLS POLICIES - Replace auth.uid() with (SELECT auth.uid())
-- =====================================================

-- testimonials table
DROP POLICY IF EXISTS "Authors can view own testimonials" ON public.testimonials;
CREATE POLICY "Authors can view own testimonials"
  ON public.testimonials
  FOR SELECT
  TO authenticated
  USING (author_email = (SELECT auth.jwt()->>'email') OR (SELECT auth.uid()) IS NOT NULL);

-- cron_execution_logs table
DROP POLICY IF EXISTS "Admins can read logs" ON public.cron_execution_logs;
CREATE POLICY "Admins can read logs"
  ON public.cron_execution_logs
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- blog_posts table
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON public.blog_posts;

CREATE POLICY "Authenticated users can create posts"
  ON public.blog_posts
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update posts"
  ON public.blog_posts
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- admin_users table
DROP POLICY IF EXISTS "Master users can view all users" ON public.admin_users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.admin_users;
DROP POLICY IF EXISTS "Master users can create users" ON public.admin_users;
DROP POLICY IF EXISTS "Master users can update users" ON public.admin_users;
DROP POLICY IF EXISTS "Users can update own last login" ON public.admin_users;
DROP POLICY IF EXISTS "Master users can delete users" ON public.admin_users;

CREATE POLICY "Master users can view all users"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = (SELECT auth.jwt()->>'email')
      AND au.role = 'master'
    )
  );

CREATE POLICY "Users can view own profile"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (email = (SELECT auth.jwt()->>'email'));

CREATE POLICY "Master users can create users"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = (SELECT auth.jwt()->>'email')
      AND au.role = 'master'
    )
  );

CREATE POLICY "Master users can update users"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = (SELECT auth.jwt()->>'email')
      AND au.role = 'master'
    )
  );

CREATE POLICY "Users can update own last login"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (email = (SELECT auth.jwt()->>'email'))
  WITH CHECK (email = (SELECT auth.jwt()->>'email'));

CREATE POLICY "Master users can delete users"
  ON public.admin_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = (SELECT auth.jwt()->>'email')
      AND au.role = 'master'
    )
  );

-- user_permissions table
DROP POLICY IF EXISTS "Master users can view all permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Master users can create permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Master users can update permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Master users can delete permissions" ON public.user_permissions;

CREATE POLICY "Master users can view all permissions"
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = (SELECT auth.jwt()->>'email')
      AND au.role = 'master'
    )
  );

CREATE POLICY "Users can view own permissions"
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.admin_users
      WHERE email = (SELECT auth.jwt()->>'email')
    )
  );

CREATE POLICY "Master users can create permissions"
  ON public.user_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = (SELECT auth.jwt()->>'email')
      AND au.role = 'master'
    )
  );

CREATE POLICY "Master users can update permissions"
  ON public.user_permissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = (SELECT auth.jwt()->>'email')
      AND au.role = 'master'
    )
  );

CREATE POLICY "Master users can delete permissions"
  ON public.user_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = (SELECT auth.jwt()->>'email')
      AND au.role = 'master'
    )
  );

-- =====================================================
-- 2. ADD MISSING RLS POLICIES
-- =====================================================

-- ai_auto_interventions
CREATE POLICY "Authenticated users can manage AI interventions"
  ON public.ai_auto_interventions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ai_experiments
CREATE POLICY "Authenticated users can manage AI experiments"
  ON public.ai_experiments
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ai_industry_intelligence
CREATE POLICY "Authenticated users can manage industry intelligence"
  ON public.ai_industry_intelligence
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ai_model_versions
CREATE POLICY "Authenticated users can manage model versions"
  ON public.ai_model_versions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ai_predictions
CREATE POLICY "Authenticated users can manage predictions"
  ON public.ai_predictions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- content_quality_scores
CREATE POLICY "Public can read quality scores"
  ON public.content_quality_scores
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can write quality scores"
  ON public.content_quality_scores
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- optimization_actions
CREATE POLICY "Authenticated users can manage optimization actions"
  ON public.optimization_actions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- performance_metrics
CREATE POLICY "Public can read performance metrics"
  ON public.performance_metrics
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can write performance metrics"
  ON public.performance_metrics
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- user_behavior_patterns
CREATE POLICY "Authenticated users can manage behavior patterns"
  ON public.user_behavior_patterns
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
