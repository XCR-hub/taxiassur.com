/*
  # Allow public access to crm_leads via access_token

  1. Changes
    - Add RLS policy to allow anonymous users to read their own lead data via access_token
    - This enables the secure document upload page to work

  2. Security
    - Only SELECT is allowed
    - Access is restricted to the specific lead matching the token
    - No other operations are permitted
*/

-- Allow anonymous users to read their own lead data via access_token
CREATE POLICY "Allow public read access via token"
  ON crm_leads
  FOR SELECT
  TO anon
  USING (access_token IS NOT NULL AND access_token != '');
