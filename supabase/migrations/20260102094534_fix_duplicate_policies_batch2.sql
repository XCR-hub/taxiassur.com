/*
  # Fix Duplicate Permissive Policies - Batch 2 (CRM)

  ## CRM Tables Policy Consolidation
  Remove duplicate policies on CRM tables while maintaining proper access control.
*/

-- ============================================================================
-- CRM AI Suggestions - Remove view-only duplicate
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_ai_suggestions'
    AND policyname = 'Backoffice can view all suggestions'
  ) THEN
    DROP POLICY "Backoffice can view all suggestions" ON public.crm_ai_suggestions;
  END IF;

  -- Remove redundant Users manage (keep user-specific view)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_ai_suggestions'
    AND policyname = 'Users manage suggestions'
  ) THEN
    DROP POLICY "Users manage suggestions" ON public.crm_ai_suggestions;
  END IF;
END $$;

-- ============================================================================
-- CRM Call Recordings - Consolidate duplicate policies
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_call_recordings'
    AND policyname = 'Authenticated manage call recordings'
  ) THEN
    DROP POLICY "Authenticated manage call recordings" ON public.crm_call_recordings;
  END IF;
END $$;

-- ============================================================================
-- CRM Companies Insurers - Remove redundant write policy
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_companies_insurers'
    AND policyname = 'Authenticated write insurers'
  ) THEN
    DROP POLICY "Authenticated write insurers" ON public.crm_companies_insurers;
  END IF;
END $$;

-- ============================================================================
-- CRM Documents - Remove view-only and user manage duplicates
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_documents'
    AND policyname = 'Backoffice can view all documents'
  ) THEN
    DROP POLICY "Backoffice can view all documents" ON public.crm_documents;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_documents'
    AND policyname = 'Users manage documents'
  ) THEN
    DROP POLICY "Users manage documents" ON public.crm_documents;
  END IF;
END $$;

-- ============================================================================
-- CRM Email Templates - Remove redundant write policy
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_email_templates'
    AND policyname = 'Authenticated write templates'
  ) THEN
    DROP POLICY "Authenticated write templates" ON public.crm_email_templates;
  END IF;
END $$;

-- ============================================================================
-- CRM Interactions - Remove view-only and user manage duplicates
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_interactions'
    AND policyname = 'Backoffice can view all interactions'
  ) THEN
    DROP POLICY "Backoffice can view all interactions" ON public.crm_interactions;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_interactions'
    AND policyname = 'Users manage interactions'
  ) THEN
    DROP POLICY "Users manage interactions" ON public.crm_interactions;
  END IF;
END $$;

-- ============================================================================
-- CRM Notifications - Remove view-only duplicate
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_notifications'
    AND policyname = 'Backoffice can view all notifications'
  ) THEN
    DROP POLICY "Backoffice can view all notifications" ON public.crm_notifications;
  END IF;
END $$;

-- ============================================================================
-- CRM Quotes Sent - Remove user manage (keep user-specific view)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_quotes_sent'
    AND policyname = 'Users manage quotes'
  ) THEN
    DROP POLICY "Users manage quotes" ON public.crm_quotes_sent;
  END IF;
END $$;

-- ============================================================================
-- CRM Tasks - Remove manage duplicate (keep specific view)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_tasks'
    AND policyname = 'Users manage own tasks'
  ) THEN
    DROP POLICY "Users manage own tasks" ON public.crm_tasks;
  END IF;
END $$;