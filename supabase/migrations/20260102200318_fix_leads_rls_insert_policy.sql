/*
  # Fix RLS policy for anonymous lead submission

  1. Changes
    - Drop the existing restrictive INSERT policy for anonymous users
    - Create a new permissive INSERT policy that allows anonymous users to create leads
    - The policy checks that required fields are present (name, email, phone, city)
  
  2. Security
    - Anonymous users can INSERT leads with proper data
    - All other operations remain protected by existing policies
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow anonymous users to submit leads" ON leads;

-- Create a new permissive INSERT policy for anonymous users
CREATE POLICY "Anonymous users can create leads"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (
    name IS NOT NULL AND 
    email IS NOT NULL AND 
    phone IS NOT NULL AND 
    city IS NOT NULL
  );
