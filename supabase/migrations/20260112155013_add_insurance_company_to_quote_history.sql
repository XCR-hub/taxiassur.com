/*
  # Add Insurance Company to Quote History
  
  1. Changes
    - Add `insurance_company_id` column to `crm_quote_history`
    - Add foreign key constraint to `insurance_companies`
    - Add index for performance
    
  2. Purpose
    - Track which insurance company each quote was sent for
    - Enable reporting by insurance company
*/

ALTER TABLE crm_quote_history 
ADD COLUMN IF NOT EXISTS insurance_company_id uuid REFERENCES insurance_companies(id);

CREATE INDEX IF NOT EXISTS idx_crm_quote_history_insurance_company 
ON crm_quote_history(insurance_company_id);

COMMENT ON COLUMN crm_quote_history.insurance_company_id IS 'Reference to the insurance company this quote is for';