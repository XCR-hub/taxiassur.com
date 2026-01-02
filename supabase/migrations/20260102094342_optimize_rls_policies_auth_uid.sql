/*
  # Optimize RLS Policies - Auth Function Calls

  ## Security & Performance  
  Replace `auth.uid()` with `(select auth.uid())` in all RLS policies.
  This prevents re-evaluation for each row, dramatically improving query performance at scale.
  
  ## Affected Tables
  - loyalty_program
  - crm_automation_history
  - crm_lead_activities
  - db_query_performance
  - db_table_stats
  - db_index_usage
  - db_connection_pool
  - db_slow_queries_log
  - webhook_logs
  - feature_flags
  - feature_flag_overrides
  - audit_logs
  - client_portal_activities
  - client_portal_users
  - client_document_requests
*/

-- loyalty_program
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'loyalty_program'
    AND policyname = 'Clients read own loyalty data'
  ) THEN
    DROP POLICY "Clients read own loyalty data" ON public.loyalty_program;
    CREATE POLICY "Clients read own loyalty data"
      ON public.loyalty_program FOR SELECT
      TO authenticated
      USING (client_id = (select auth.uid()));
  END IF;
END $$;

-- crm_automation_history  
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_automation_history'
    AND policyname = 'See automation history authenticated'
  ) THEN
    DROP POLICY "See automation history authenticated" ON public.crm_automation_history;
    CREATE POLICY "See automation history authenticated"
      ON public.crm_automation_history FOR SELECT
      TO authenticated
      USING ((select auth.uid()) IS NOT NULL);
  END IF;
END $$;

-- db_query_performance
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'db_query_performance'
    AND policyname = 'Admin users can view performance data'
  ) THEN
    DROP POLICY "Admin users can view performance data" ON public.db_query_performance;
    CREATE POLICY "Admin users can view performance data"
      ON public.db_query_performance FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE admin_users.id = (select auth.uid())
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- db_table_stats
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'db_table_stats'
    AND policyname = 'Admin users can view table stats'
  ) THEN
    DROP POLICY "Admin users can view table stats" ON public.db_table_stats;
    CREATE POLICY "Admin users can view table stats"
      ON public.db_table_stats FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE admin_users.id = (select auth.uid())
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- db_index_usage
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'db_index_usage'
    AND policyname = 'Admin users can view index usage'
  ) THEN
    DROP POLICY "Admin users can view index usage" ON public.db_index_usage;
    CREATE POLICY "Admin users can view index usage"
      ON public.db_index_usage FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE admin_users.id = (select auth.uid())
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- db_connection_pool
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'db_connection_pool'
    AND policyname = 'Admin users can view connection pool'
  ) THEN
    DROP POLICY "Admin users can view connection pool" ON public.db_connection_pool;
    CREATE POLICY "Admin users can view connection pool"
      ON public.db_connection_pool FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE admin_users.id = (select auth.uid())
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- db_slow_queries_log
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'db_slow_queries_log'
    AND policyname = 'Admin users can view slow queries'
  ) THEN
    DROP POLICY "Admin users can view slow queries" ON public.db_slow_queries_log;
    CREATE POLICY "Admin users can view slow queries"
      ON public.db_slow_queries_log FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE admin_users.id = (select auth.uid())
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- webhook_logs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'webhook_logs'
    AND policyname = 'Admin users can view webhook logs'
  ) THEN
    DROP POLICY "Admin users can view webhook logs" ON public.webhook_logs;
    CREATE POLICY "Admin users can view webhook logs"
      ON public.webhook_logs FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE admin_users.id = (select auth.uid())
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- feature_flags
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'feature_flags'
    AND policyname = 'Admin users can manage flags'
  ) THEN
    DROP POLICY "Admin users can manage flags" ON public.feature_flags;
    CREATE POLICY "Admin users can manage flags"
      ON public.feature_flags FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE admin_users.id = (select auth.uid())
          AND admin_users.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE admin_users.id = (select auth.uid())
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- feature_flag_overrides
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'feature_flag_overrides'
    AND policyname = 'Users can read their own overrides'
  ) THEN
    DROP POLICY "Users can read their own overrides" ON public.feature_flag_overrides;
    CREATE POLICY "Users can read their own overrides"
      ON public.feature_flag_overrides FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'feature_flag_overrides'
    AND policyname = 'Admin users can manage overrides'
  ) THEN
    DROP POLICY "Admin users can manage overrides" ON public.feature_flag_overrides;
    CREATE POLICY "Admin users can manage overrides"
      ON public.feature_flag_overrides FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE admin_users.id = (select auth.uid())
          AND admin_users.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE admin_users.id = (select auth.uid())
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- audit_logs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'audit_logs'
    AND policyname = 'Admin users can view audit logs'
  ) THEN
    DROP POLICY "Admin users can view audit logs" ON public.audit_logs;
    CREATE POLICY "Admin users can view audit logs"
      ON public.audit_logs FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE admin_users.id = (select auth.uid())
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- client_portal_activities
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_portal_activities'
    AND policyname = 'Clients read own activities'
  ) THEN
    DROP POLICY "Clients read own activities" ON public.client_portal_activities;
    CREATE POLICY "Clients read own activities"
      ON public.client_portal_activities FOR SELECT
      TO authenticated
      USING (portal_user_id = (select auth.uid()));
  END IF;
END $$;

-- client_portal_users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_portal_users'
    AND policyname = 'Clients read own data'
  ) THEN
    DROP POLICY "Clients read own data" ON public.client_portal_users;
    CREATE POLICY "Clients read own data"
      ON public.client_portal_users FOR SELECT
      TO authenticated
      USING (id = (select auth.uid()));
  END IF;
END $$;

-- client_document_requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_document_requests'
    AND policyname = 'Clients read own requests'
  ) THEN
    DROP POLICY "Clients read own requests" ON public.client_document_requests;
    CREATE POLICY "Clients read own requests"
      ON public.client_document_requests FOR SELECT
      TO authenticated
      USING (portal_user_id = (select auth.uid()));
  END IF;
END $$;