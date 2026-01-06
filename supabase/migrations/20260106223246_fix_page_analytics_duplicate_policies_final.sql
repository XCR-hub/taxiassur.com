/*
  # Fix page_analytics Remaining Multiple Permissive Policies

  1. Changes
    - Removes all remaining duplicate INSERT policies
    - Creates single consolidated INSERT policy for both anon and authenticated
    - Keeps UPDATE policies separate (they don't conflict)

  2. Issues Fixed
    - anon role: "Anon can insert page analytics" + "Public can track page analytics" → 1 policy
    - authenticated role: "Authenticated can insert page analytics" + "Public can track page analytics" → 1 policy

  3. Security
    - Public tracking remains enabled for analytics
    - Single policy applies to both anon and authenticated roles
*/

-- Drop all existing INSERT policies that might conflict
DROP POLICY IF EXISTS "Anon can insert page analytics" ON public.page_analytics;
DROP POLICY IF EXISTS "Authenticated can insert page analytics" ON public.page_analytics;
DROP POLICY IF EXISTS "Public can insert page analytics" ON public.page_analytics;
DROP POLICY IF EXISTS "Public can track page analytics" ON public.page_analytics;
DROP POLICY IF EXISTS "Authenticated users can insert page analytics" ON public.page_analytics;

-- Create single consolidated INSERT policy for both anon and authenticated
CREATE POLICY "Public and authenticated can track page analytics"
ON public.page_analytics FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Keep existing UPDATE policies (they're separate and don't conflict)
-- "Anon users can update their own page analytics" - anon UPDATE
-- "Authenticated users can update their own page analytics" - authenticated UPDATE
