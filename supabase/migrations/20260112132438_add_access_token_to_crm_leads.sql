/*
  # Add access_token column to crm_leads

  1. Changes
    - Add access_token column to crm_leads table
    - Copy existing access_tokens from leads table
    - Add trigger to auto-generate access_token for new leads

  2. Purpose
    - Allow prospects to access their secure document upload space
    - Enable personalized email links with secure tokens
*/

-- Add access_token column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN access_token text;
  END IF;
END $$;

-- Copy access_tokens from leads table where they exist
UPDATE crm_leads cl
SET access_token = l.access_token
FROM leads l
WHERE cl.email = l.email
AND l.access_token IS NOT NULL
AND cl.access_token IS NULL;

-- Generate access_tokens for leads that don't have one
UPDATE crm_leads
SET access_token = encode(extensions.gen_random_bytes(32), 'hex')
WHERE access_token IS NULL;

-- Create index for access_token lookups
CREATE INDEX IF NOT EXISTS idx_crm_leads_access_token ON crm_leads(access_token);

-- Create function to auto-generate access_token
CREATE OR REPLACE FUNCTION public.generate_crm_lead_access_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.access_token IS NULL THEN
    NEW.access_token := encode(extensions.gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new leads
DROP TRIGGER IF EXISTS trg_crm_leads_access_token ON crm_leads;
CREATE TRIGGER trg_crm_leads_access_token
  BEFORE INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION generate_crm_lead_access_token();