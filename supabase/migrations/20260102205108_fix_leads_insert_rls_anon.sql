/*
  # Fix RLS policy for anonymous lead creation
  
  1. Changes
    - Drop the restrictive INSERT policy for anon users
    - Create a simpler policy that allows any anon user to insert leads
    - This fixes the "new row violates row-level security policy" error
  
  2. Security
    - Anon users can only INSERT (create new leads)
    - They cannot UPDATE or DELETE (those require authentication)
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Anonymous users can create leads" ON leads;

-- Create simpler INSERT policy for anonymous users
CREATE POLICY "Anon can insert leads"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);
