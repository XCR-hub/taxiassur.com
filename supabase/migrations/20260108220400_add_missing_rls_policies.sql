/*
  # Add Missing RLS Policies

  **Security Fix**: Tables with RLS enabled but no policies
  
  These tables have RLS enabled but no policies, meaning NO ONE can access them.
  This migration adds admin-only policies to restore access.
  
  ## Tables Fixed:
  - crm_ai_governance_sessions
  - crm_ai_recommendations
  - crm_vehicles  
  - crm_workflow_runs
  - crm_workflows
*/

-- crm_ai_governance_sessions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crm_ai_governance_sessions' 
    AND policyname = 'Admins full access governance_sessions'
  ) THEN
    CREATE POLICY "Admins full access governance_sessions"
      ON crm_ai_governance_sessions
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.id = auth.uid()
          AND admin_users.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.id = auth.uid()
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- crm_ai_recommendations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crm_ai_recommendations' 
    AND policyname = 'Admins full access ai_recommendations'
  ) THEN
    CREATE POLICY "Admins full access ai_recommendations"
      ON crm_ai_recommendations
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.id = auth.uid()
          AND admin_users.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.id = auth.uid()
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- crm_vehicles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crm_vehicles' 
    AND policyname = 'Admins full access vehicles'
  ) THEN
    CREATE POLICY "Admins full access vehicles"
      ON crm_vehicles
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.id = auth.uid()
          AND admin_users.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.id = auth.uid()
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- crm_workflow_runs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crm_workflow_runs' 
    AND policyname = 'Admins full access workflow_runs'
  ) THEN
    CREATE POLICY "Admins full access workflow_runs"
      ON crm_workflow_runs
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.id = auth.uid()
          AND admin_users.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.id = auth.uid()
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;

-- crm_workflows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crm_workflows' 
    AND policyname = 'Admins full access workflows'
  ) THEN
    CREATE POLICY "Admins full access workflows"
      ON crm_workflows
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.id = auth.uid()
          AND admin_users.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE admin_users.id = auth.uid()
          AND admin_users.is_active = true
        )
      );
  END IF;
END $$;
