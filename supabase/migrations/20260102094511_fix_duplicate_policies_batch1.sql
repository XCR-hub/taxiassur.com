/*
  # Fix Duplicate Permissive Policies - Batch 1

  ## Security Fix
  Remove duplicate permissive policies that can create security vulnerabilities.
  Keep only the most restrictive and necessary policies.
  
  ## Strategy
  - Drop redundant "Backoffice can view" policies when "Backoffice can manage" exists
  - Consolidate "Auth manage" and "Authenticated manage" duplicate policies
  - Keep user-specific access policies separate
*/

-- ============================================================================
-- AI Code Suggestions - Remove view-only policy (manage policy covers it)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ai_code_suggestions'
    AND policyname = 'Backoffice can view ai_code_suggestions'
  ) THEN
    DROP POLICY "Backoffice can view ai_code_suggestions" ON public.ai_code_suggestions;
  END IF;
END $$;

-- ============================================================================
-- AI Learning Data - Remove redundant auth policies
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ai_learning_data'
    AND policyname = 'Authenticated manage AI learning'
  ) THEN
    DROP POLICY "Authenticated manage AI learning" ON public.ai_learning_data;
  END IF;
END $$;

-- ============================================================================
-- AI Performance Metrics - Consolidate duplicate policies
-- ============================================================================
DO $$
BEGIN
  -- Remove redundant public read (backoffice view covers it)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ai_performance_metrics'
    AND policyname = 'Public read AI metrics'
  ) THEN
    DROP POLICY "Public read AI metrics" ON public.ai_performance_metrics;
  END IF;

  -- Remove Auth manage (Backoffice covers it)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ai_performance_metrics'
    AND policyname = 'Auth manage AI metrics'
  ) THEN
    DROP POLICY "Auth manage AI metrics" ON public.ai_performance_metrics;
  END IF;
END $$;

-- ============================================================================
-- Automated Email Sequences - Remove old duplicate policy
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'automated_email_sequences'
    AND policyname = 'Authenticated manage email sequences'
  ) THEN
    DROP POLICY "Authenticated manage email sequences" ON public.automated_email_sequences;
  END IF;
END $$;

-- ============================================================================
-- Client Documents - Remove redundant auth policy
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_documents'
    AND policyname = 'Auth users manage client documents'
  ) THEN
    DROP POLICY "Auth users manage client documents" ON public.client_documents;
  END IF;
END $$;

-- ============================================================================
-- Client Invoices - Remove redundant auth policy
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_invoices'
    AND policyname = 'Auth users manage client invoices'
  ) THEN
    DROP POLICY "Auth users manage client invoices" ON public.client_invoices;
  END IF;
END $$;

-- ============================================================================
-- Client Portal Activities - Keep user-specific read, remove system duplicate
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'client_portal_activities'
    AND policyname = 'Authenticated manage portal activities'
  ) THEN
    DROP POLICY "Authenticated manage portal activities" ON public.client_portal_activities;
  END IF;
END $$;