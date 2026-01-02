/*
  # Fix Duplicate Permissive Policies - Batch 3 (Final)

  ## System Tables Policy Consolidation
  Final batch of duplicate policy removal for system and utility tables.
*/

-- ============================================================================
-- Data Sources Tracking - Consolidate auth policies
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'data_sources_tracking'
    AND policyname = 'Auth users read data sources tracking'
  ) THEN
    DROP POLICY "Auth users read data sources tracking" ON public.data_sources_tracking;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'data_sources_tracking'
    AND policyname = 'Auth users update data sources tracking'
  ) THEN
    DROP POLICY "Auth users update data sources tracking" ON public.data_sources_tracking;
  END IF;
END $$;

-- ============================================================================
-- Email Templates Dynamic - Remove auth users duplicates
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'email_templates_dynamic'
    AND policyname = 'Auth users manage dynamic email templates'
  ) THEN
    DROP POLICY "Auth users manage dynamic email templates" ON public.email_templates_dynamic;
  END IF;
END $$;

-- ============================================================================
-- Email Workflows - Remove auth users duplicates
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'email_workflows'
    AND policyname = 'Auth users manage email workflows'
  ) THEN
    DROP POLICY "Auth users manage email workflows" ON public.email_workflows;
  END IF;
END $$;

-- ============================================================================
-- Feature Flags & Overrides - Keep admin + user-specific read
-- ============================================================================
DO $$
BEGIN
  -- Keep "Anyone can read enabled flags" for public access
  -- Keep "Admin users can manage flags" for admin operations
  -- Keep "Users can read their own overrides" for user-specific
  -- Keep "Admin users can manage overrides" for admin operations
  NULL; -- No changes needed, policies are correctly separated
END $$;

-- ============================================================================
-- IA Auto Rules - Remove auth users duplicates
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ia_auto_rules'
    AND policyname = 'Auth users manage ia auto rules'
  ) THEN
    DROP POLICY "Auth users manage ia auto rules" ON public.ia_auto_rules;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ia_auto_rules'
    AND policyname = 'Auth users read ia auto rules'
  ) THEN
    DROP POLICY "Auth users read ia auto rules" ON public.ia_auto_rules;
  END IF;
END $$;

-- ============================================================================
-- IA Learning Sessions - Remove auth users duplicates
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ia_learning_sessions'
    AND policyname = 'Auth users manage ia learning sessions'
  ) THEN
    DROP POLICY "Auth users manage ia learning sessions" ON public.ia_learning_sessions;
  END IF;
END $$;

-- ============================================================================
-- Loyalty Program - Remove auth users duplicates
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'loyalty_program'
    AND policyname = 'Auth users manage loyalty program'
  ) THEN
    DROP POLICY "Auth users manage loyalty program" ON public.loyalty_program;
  END IF;
END $$;

-- ============================================================================
-- Sinistre Tables - Remove auth users duplicates
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sinistre_actors'
    AND policyname = 'Auth users manage sinistre actors'
  ) THEN
    DROP POLICY "Auth users manage sinistre actors" ON public.sinistre_actors;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sinistre_exchanges'
    AND policyname = 'Auth users manage sinistre exchanges'
  ) THEN
    DROP POLICY "Auth users manage sinistre exchanges" ON public.sinistre_exchanges;
  END IF;
END $$;

-- ============================================================================
-- SMS Logs - Remove duplicate view policy
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sms_logs'
    AND policyname = 'Authenticated users can view sms logs'
  ) THEN
    DROP POLICY "Authenticated users can view sms logs" ON public.sms_logs;
  END IF;
END $$;

-- ============================================================================
-- Testimonials - Keep both (different purposes: public vs author access)
-- ============================================================================
DO $$
BEGIN
  -- Keep "Anyone can view approved testimonials" for public
  -- Keep "Authors can view own testimonials" for author access
  NULL; -- No changes needed
END $$;

-- ============================================================================
-- WhatsApp Tables - Consolidate auth manage and auth view
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'wa_contacts'
    AND policyname = 'Auth view contacts'
  ) THEN
    DROP POLICY "Auth view contacts" ON public.wa_contacts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'wa_conversations'
    AND policyname = 'Auth view conversations'
  ) THEN
    DROP POLICY "Auth view conversations" ON public.wa_conversations;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'wa_templates'
    AND policyname = 'Auth view templates'
  ) THEN
    DROP POLICY "Auth view templates" ON public.wa_templates;
  END IF;
END $$;