/*
  # Force PostgREST Schema Cache Reload for lead_company_quotes

  ## Issue
  PostgREST returns error: "Could not find the 'insurance_company_id' column of 'lead_company_quotes' in the schema cache"
  
  ## Solution
  Force PostgREST to reload its schema cache by:
  1. Sending NOTIFY signals
  2. Temporarily modifying and reverting a column comment
  3. Updating table statistics

  ## Impact
  - No data changes
  - No schema changes
  - Forces PostgREST to refresh its cached schema
*/

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Update table comment to force cache invalidation
COMMENT ON TABLE public.lead_company_quotes IS 'Devis par compagnie d''assurance - Updated 14 Feb 2026 16:50';

-- Update column comment for insurance_company_id
COMMENT ON COLUMN public.lead_company_quotes.insurance_company_id IS 'ID de la compagnie d''assurance (FK vers insurance_companies)';

-- Refresh table statistics (helps PostgREST query planner)
ANALYZE public.lead_company_quotes;

-- Verify the column exists and is accessible
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_company_quotes' 
        AND column_name = 'insurance_company_id'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        RAISE EXCEPTION 'Column insurance_company_id not found in lead_company_quotes';
    END IF;
    
    RAISE NOTICE 'Column insurance_company_id exists and is accessible';
END $$;
