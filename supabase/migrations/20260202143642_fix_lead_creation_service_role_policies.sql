/*
  # Fix Lead Creation - Allow Service Role Inserts

  1. Changes
    - Allow service role to insert into crm_interactions
    - Allow service role to insert into email_messages
    - These are needed for the Edge Function that sends emails
  
  2. Security
    - Service role can bypass RLS safely for system operations
    - Maintains security for user-facing operations
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can insert interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Service role can insert email messages" ON email_messages;
DROP POLICY IF EXISTS "Anon users cannot insert interactions" ON crm_interactions;

-- Allow service role (used by Edge Functions) to insert interactions
CREATE POLICY "Service role can insert interactions"
ON crm_interactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to insert email messages
CREATE POLICY "Service role can insert email messages"
ON email_messages
FOR INSERT
TO service_role
WITH CHECK (true);
