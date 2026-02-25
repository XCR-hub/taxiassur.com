/*
  # Fix upsert_lead function ambiguity

  1. Problem
    - 2 functions exist: upsert_lead(7 params) and upsert_lead(8 params)
    - Frontend RPC calls fail due to ambiguity
    - Leads are not created from the website form

  2. Solution
    - Drop the old 7-parameter version
    - Keep only the 8-parameter version with p_force_new_lead
    - This allows proper lead creation with email notifications
*/

-- Drop the old 7-parameter version to avoid ambiguity
DROP FUNCTION IF EXISTS public.upsert_lead(
  text, text, text, text, text, text, jsonb
);

-- The 8-parameter version with p_force_new_lead already exists and works correctly
-- No need to recreate it

-- Grant execute permissions to ensure frontend can call it
GRANT EXECUTE ON FUNCTION public.upsert_lead(
  text, text, text, text, text, text, jsonb, boolean
) TO anon, authenticated;

COMMENT ON FUNCTION public.upsert_lead(text, text, text, text, text, text, jsonb, boolean) IS
'Creates or updates a lead. Sends welcome emails automatically. Use p_force_new_lead=true for multi-vehicle leads.';