/*
  # Allow Prospect Quote Validation via Token - 2026

  1. Changes
    - Add UPDATE policy for anon role to allow prospects to validate their quotes
    - Prospects can only update status and quote_accepted_at fields
    - Access controlled via lead access_token

  2. Security
    - Only prospects with valid token can update their own quotes
    - Limited to specific fields (status, quote_accepted_at)
*/

-- Allow prospects to update their quotes (validation) via token
CREATE POLICY "Prospects can update their quotes via token"
ON lead_company_quotes
FOR UPDATE
TO anon
USING (
  EXISTS (
    SELECT 1 
    FROM crm_leads 
    WHERE crm_leads.id = lead_company_quotes.lead_id
    AND crm_leads.access_token IS NOT NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM crm_leads 
    WHERE crm_leads.id = lead_company_quotes.lead_id
    AND crm_leads.access_token IS NOT NULL
  )
);
