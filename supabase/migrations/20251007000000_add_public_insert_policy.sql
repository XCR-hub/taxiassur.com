/*
  # Add Public Insert Policy for Leads Table

  1. Changes
    - Add policy to allow anonymous users to INSERT leads from the website form
    - Keep read/update/delete restricted to service_role only

  2. Security
    - Only INSERT is allowed for anonymous users
    - All other operations remain restricted
    - Data validation is handled by CHECK constraints and application logic

  3. Instructions
    - Go to your Supabase Dashboard: https://supabase.com/dashboard/project/viuuznfqkauatkjcegcj
    - Click "SQL Editor" in the left sidebar
    - Copy and paste this SQL and click "Run"
*/

-- Create policy for anonymous INSERT on leads
CREATE POLICY IF NOT EXISTS "Allow anonymous users to submit leads"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Verify the policy was created
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'leads';
