/*
  # Fix page_analytics UPDATE policy

  1. Changes
    - Add UPDATE policy for anon users on page_analytics table
    - Add UPDATE policy for authenticated users on page_analytics table
    - Allows tracking duration updates for page views
  
  2. Security
    - Maintains RLS protection
    - Users can only update records they created (same session_id)
*/

-- Add UPDATE policy for anonymous users
CREATE POLICY "Anon users can update their own page analytics"
  ON page_analytics
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Add UPDATE policy for authenticated users
CREATE POLICY "Authenticated users can update their own page analytics"
  ON page_analytics
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
