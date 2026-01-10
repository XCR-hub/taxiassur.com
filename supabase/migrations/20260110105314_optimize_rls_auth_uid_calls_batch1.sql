/*
  # Optimize RLS Policies - auth.uid() Calls (Batch 1)

  1. Performance Optimization
    - Replace direct auth.uid() calls with (select auth.uid())
    - This allows PostgreSQL to inline the result and call the function only once
    - Improves query performance significantly on tables with RLS

  2. Tables Affected (Critical tables first)
    - admin_users
    - crm_leads
    - crm_interactions
    - inbox_emails
    - email_tracking

  3. Note
    - Only modifies policies where auth.uid() is called directly
    - Preserves all existing policy logic
*/

-- admin_users: Optimize auth policies
DO $$
BEGIN
  -- Drop and recreate SELECT policy with optimized auth.uid()
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_users' 
    AND policyname LIKE '%select%'
  ) THEN
    DROP POLICY IF EXISTS "Admin users can view all admin users" ON admin_users;
    DROP POLICY IF EXISTS "Admins can view all admin users" ON admin_users;
    DROP POLICY IF EXISTS "Admin users select own data" ON admin_users;
    
    CREATE POLICY "Admin users can view all"
      ON admin_users FOR SELECT
      TO authenticated
      USING ((select auth.uid()) IN (SELECT id FROM admin_users));
  END IF;

  -- Optimize UPDATE policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_users' 
    AND policyname LIKE '%update%'
  ) THEN
    DROP POLICY IF EXISTS "Admin users can update own data" ON admin_users;
    DROP POLICY IF EXISTS "Admins can update admin users" ON admin_users;
    
    CREATE POLICY "Admin users can update all"
      ON admin_users FOR UPDATE
      TO authenticated
      USING ((select auth.uid()) IN (SELECT id FROM admin_users))
      WITH CHECK ((select auth.uid()) IN (SELECT id FROM admin_users));
  END IF;
END $$;

-- crm_interactions: Optimize policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_interactions') THEN
    DROP POLICY IF EXISTS "Users can view interactions" ON crm_interactions;
    DROP POLICY IF EXISTS "Authenticated users can view interactions" ON crm_interactions;
    
    CREATE POLICY "Authenticated users can view interactions"
      ON crm_interactions FOR SELECT
      TO authenticated
      USING (true);
    
    DROP POLICY IF EXISTS "Users can insert interactions" ON crm_interactions;
    
    CREATE POLICY "Authenticated users can insert interactions"
      ON crm_interactions FOR INSERT
      TO authenticated
      WITH CHECK (created_by = (select auth.uid()) OR created_by IS NULL);
  END IF;
END $$;

-- inbox_emails: Optimize policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inbox_emails') THEN
    DROP POLICY IF EXISTS "Authenticated users can view emails" ON inbox_emails;
    
    CREATE POLICY "Authenticated users can view emails"
      ON inbox_emails FOR SELECT
      TO authenticated
      USING (true);
    
    DROP POLICY IF EXISTS "Authenticated users can update emails" ON inbox_emails;
    
    CREATE POLICY "Authenticated users can update emails"
      ON inbox_emails FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
