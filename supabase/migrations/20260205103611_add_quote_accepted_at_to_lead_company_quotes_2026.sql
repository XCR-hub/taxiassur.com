/*
  # Add quote_accepted_at to lead_company_quotes - 2026

  1. Changes
    - Add quote_accepted_at column to track when prospect accepts a quote
    - Add index for performance on this new column

  2. Purpose
    - Track when prospects validate their quotes in the client portal
    - Enable workflow automation based on quote acceptance
*/

-- Add quote_accepted_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_company_quotes' 
    AND column_name = 'quote_accepted_at'
  ) THEN
    ALTER TABLE lead_company_quotes 
    ADD COLUMN quote_accepted_at timestamptz;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_accepted_at 
ON lead_company_quotes(quote_accepted_at) 
WHERE quote_accepted_at IS NOT NULL;

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_status 
ON lead_company_quotes(status);
