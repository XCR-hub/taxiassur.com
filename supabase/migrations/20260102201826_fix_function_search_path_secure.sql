/*
  # Fix Function Search Path Security Issue
  
  This migration sets an immutable search_path for the function `calculate_automation_roi`
  to prevent search_path injection attacks.
  
  ## Security Impact
  
  Functions with mutable search_path are vulnerable to search_path injection attacks
  where an attacker can create malicious objects in their own schema and trick the
  function into using them.
  
  ## Changes Made
  
  - Set search_path for calculate_automation_roi to 'public, pg_temp'
  - This ensures the function only looks in the public schema and temporary objects
*/

-- Check if function exists and recreate with secure search_path
DO $$
DECLARE
  func_exists boolean;
BEGIN
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'calculate_automation_roi'
  ) INTO func_exists;
  
  IF func_exists THEN
    -- Drop the function
    DROP FUNCTION IF EXISTS public.calculate_automation_roi(UUID, INTEGER);
    
    -- Recreate with secure search_path
    CREATE OR REPLACE FUNCTION public.calculate_automation_roi(
      automation_id UUID,
      period_days INTEGER DEFAULT 30
    )
    RETURNS TABLE (
      total_actions INTEGER,
      successful_actions INTEGER,
      time_saved_hours NUMERIC,
      cost_saved NUMERIC,
      roi_percentage NUMERIC
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $func$
    DECLARE
      avg_time_per_action NUMERIC := 0.5;
      avg_cost_per_hour NUMERIC := 50;
    BEGIN
      RETURN QUERY
      SELECT 
        COUNT(*)::INTEGER as total_actions,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as successful_actions,
        (COUNT(*) FILTER (WHERE status = 'completed') * avg_time_per_action)::NUMERIC as time_saved_hours,
        (COUNT(*) FILTER (WHERE status = 'completed') * avg_time_per_action * avg_cost_per_hour)::NUMERIC as cost_saved,
        CASE 
          WHEN COUNT(*) > 0 THEN 
            ((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100)::NUMERIC
          ELSE 0::NUMERIC
        END as roi_percentage
      FROM public.ia_actions_log
      WHERE 
        automation_type = (
          SELECT automation_type 
          FROM public.ia_actions_log 
          WHERE id = automation_id 
          LIMIT 1
        )
        AND created_at >= NOW() - (period_days || ' days')::INTERVAL;
    END;
    $func$;
    
    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.calculate_automation_roi(UUID, INTEGER) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.calculate_automation_roi(UUID, INTEGER) TO service_role;
  END IF;
END $$;
