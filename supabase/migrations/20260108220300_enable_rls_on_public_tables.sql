/*
  # Enable RLS on Public Tables (CRITICAL SECURITY FIX)

  **Security Issue**: Tables in public schema must have RLS enabled
  
  This migration enables Row Level Security on tables that are currently exposed.
  These tables had RLS disabled, meaning ANY authenticated user could access ALL data.
  
  ## Tables Fixed:
  - crm_ai_agents
  - crm_ai_learning_features
  - crm_ai_strategy_performance
  
  ## Security Impact:
  Before: Any authenticated user could read/write ALL data
  After: Access controlled by RLS policies (will be added next)
*/

-- Enable RLS on tables that are currently public
ALTER TABLE IF EXISTS crm_ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_ai_learning_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_ai_strategy_performance ENABLE ROW LEVEL SECURITY;

-- Add basic policies for admin access
-- crm_ai_agents
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crm_ai_agents' 
    AND policyname = 'Admins full access crm_ai_agents'
  ) THEN
    CREATE POLICY "Admins full access crm_ai_agents"
      ON crm_ai_agents
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

-- crm_ai_learning_features
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crm_ai_learning_features' 
    AND policyname = 'Admins full access crm_ai_learning_features'
  ) THEN
    CREATE POLICY "Admins full access crm_ai_learning_features"
      ON crm_ai_learning_features
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

-- crm_ai_strategy_performance
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crm_ai_strategy_performance' 
    AND policyname = 'Admins full access crm_ai_strategy_performance'
  ) THEN
    CREATE POLICY "Admins full access crm_ai_strategy_performance"
      ON crm_ai_strategy_performance
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
