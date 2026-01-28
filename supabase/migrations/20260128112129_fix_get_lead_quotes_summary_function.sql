/*
  # Fix get_lead_quotes_summary function

  1. Changes
    - Update function to use lead_company_quotes table instead of lead_quotes
    - Update status names to match new statuses (quote_submitted, refused instead of quote_uploaded, refused_by_company)
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_lead_quotes_summary(uuid);

-- Recreate the function with correct table and status names
CREATE OR REPLACE FUNCTION get_lead_quotes_summary(lead_id_param UUID)
RETURNS TABLE (
  total_companies INTEGER,
  quotes_pending INTEGER,
  quotes_uploaded INTEGER,
  quotes_refused_by_company INTEGER,
  quotes_accepted_by_client INTEGER,
  quotes_refused_by_client INTEGER,
  all_processed BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(ic.*)::INTEGER as total_companies,
    COUNT(*) FILTER (WHERE lcq.status IS NULL OR lcq.status = 'pending')::INTEGER as quotes_pending,
    COUNT(*) FILTER (WHERE lcq.status IN ('quote_submitted', 'validated'))::INTEGER as quotes_uploaded,
    COUNT(*) FILTER (WHERE lcq.status = 'refused')::INTEGER as quotes_refused_by_company,
    0::INTEGER as quotes_accepted_by_client,
    0::INTEGER as quotes_refused_by_client,
    (COUNT(*) FILTER (WHERE lcq.status IS NULL OR lcq.status = 'pending') = 0) as all_processed
  FROM insurance_companies ic
  LEFT JOIN lead_company_quotes lcq ON lcq.company_id = ic.id AND lcq.lead_id = lead_id_param
  WHERE ic.is_mandatory = true;
END;
$$;
