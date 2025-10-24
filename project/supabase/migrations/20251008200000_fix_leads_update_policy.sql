/*
  # Fix Leads UPDATE Policy

  1. Changes
    - Add UPDATE policy for leads table
    - Allows anon to update leads (for backoffice)

  2. Security
    - RLS enabled
    - Anon can update (backoffice usage)
*/

-- Drop existing update policy if exists
DROP POLICY IF EXISTS "Allow anon to update leads" ON leads;

-- Allow anon to update leads
CREATE POLICY "Allow anon to update leads"
  ON leads
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
