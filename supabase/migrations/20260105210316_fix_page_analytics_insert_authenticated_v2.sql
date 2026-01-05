/*
  # Fix page_analytics INSERT policy for authenticated users

  1. Changes
    - Add INSERT policy for authenticated users on page_analytics table
    - Allow both anon and authenticated roles to insert analytics
  
  2. Security
    - Maintains RLS protection
    - Allows anonymous and authenticated users to track page views
*/

-- Drop existing policy if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'page_analytics' 
    AND policyname = 'Authenticated users can insert page analytics'
  ) THEN
    DROP POLICY "Authenticated users can insert page analytics" ON page_analytics;
  END IF;
END $$;

-- Add INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert page analytics"
  ON page_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
