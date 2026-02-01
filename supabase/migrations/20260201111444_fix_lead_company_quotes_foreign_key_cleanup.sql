/*
  # Fix lead_company_quotes Foreign Key - Cleanup & Update

  1. Changes
    - Remove orphaned records that don't have a matching lead in crm_leads
    - Drop old foreign key constraint referencing leads(id)
    - Add new foreign key constraint referencing crm_leads(id)
  
  2. Security
    - Maintains existing RLS policies
    - Cleans up orphaned data
*/

-- Step 1: Remove orphaned records (where lead_id doesn't exist in crm_leads)
DELETE FROM lead_company_quotes
WHERE lead_id NOT IN (SELECT id FROM crm_leads);

-- Step 2: Drop the old foreign key constraint
ALTER TABLE lead_company_quotes 
DROP CONSTRAINT IF EXISTS lead_company_quotes_lead_id_fkey;

-- Step 3: Add new foreign key constraint pointing to crm_leads
ALTER TABLE lead_company_quotes
ADD CONSTRAINT lead_company_quotes_lead_id_fkey 
FOREIGN KEY (lead_id) 
REFERENCES crm_leads(id) 
ON DELETE CASCADE;

-- Step 4: Verify index still exists
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_lead_id 
ON lead_company_quotes(lead_id);
