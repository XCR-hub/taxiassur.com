/*
  # Fix leads table RLS for authenticated users

  ## Problem
  Users who are logged into the backoffice (authenticated role) cannot create leads
  because there is no INSERT policy for the authenticated role, only for anon.

  ## Changes
  - Add INSERT policy for authenticated users
  - Add SELECT, UPDATE policies for authenticated users for consistency
  
  ## Security
  - Authenticated users can insert, read, and update leads
  - This allows backoffice users to create leads manually
  - RLS remains active for data protection
*/

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can read all leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;

-- Allow authenticated users to insert leads
CREATE POLICY "Authenticated users can insert leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to read all leads
CREATE POLICY "Authenticated users can read all leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update leads
CREATE POLICY "Authenticated users can update leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
