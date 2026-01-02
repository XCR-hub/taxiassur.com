/*
  # Fix Security Definer View - wa_templates_usage
  
  This migration recreates the view `wa_templates_usage` without SECURITY DEFINER
  to prevent potential security issues.
  
  ## Security Impact
  
  SECURITY DEFINER views can potentially expose data to unauthorized users by executing
  with the privileges of the view owner rather than the current user.
  
  ## Changes Made
  
  - Drop and recreate wa_templates_usage view without SECURITY DEFINER
  - Maintain the same functionality but with proper access control
*/

-- Drop the existing view
DROP VIEW IF EXISTS public.wa_templates_usage CASCADE;

-- Recreate without SECURITY DEFINER
CREATE OR REPLACE VIEW public.wa_templates_usage AS
SELECT 
  name,
  category,
  language,
  approved,
  usage_count,
  variables,
  length(body) AS body_length,
  jsonb_array_length(variables) AS variable_count,
  created_at
FROM public.wa_templates t
ORDER BY usage_count DESC, name;

-- Grant appropriate permissions
GRANT SELECT ON public.wa_templates_usage TO authenticated;
GRANT SELECT ON public.wa_templates_usage TO service_role;

-- Add RLS policy if needed
ALTER VIEW public.wa_templates_usage SET (security_invoker = true);
