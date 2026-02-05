/*
  # Fix get_lead_quotes_by_token function - Status Type - 2026

  1. Changes
    - Fix status column type from text to match actual enum type
    - Cast status to text in the query

  2. Security
    - Maintains existing security model with token validation
*/

-- Drop and recreate the function with correct type
DROP FUNCTION IF EXISTS get_lead_quotes_by_token(text);

CREATE OR REPLACE FUNCTION get_lead_quotes_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  company_id uuid,
  company_name text,
  company_logo_url text,
  quote_file_url text,
  quote_amount numeric,
  status text,
  submitted_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Get lead_id from token
  SELECT cl.id INTO v_lead_id
  FROM crm_leads cl
  WHERE cl.access_token = p_token
  LIMIT 1;

  -- If no lead found, return empty
  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  -- Return quotes with company info, casting status to text
  RETURN QUERY
  SELECT 
    lcq.id,
    lcq.lead_id,
    lcq.company_id,
    ic.name as company_name,
    ic.logo_url as company_logo_url,
    lcq.quote_file_url,
    lcq.quote_amount,
    lcq.status::text,  -- Cast enum to text
    lcq.submitted_at,
    lcq.last_sent_at,
    lcq.created_at
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.company_id
  WHERE lcq.lead_id = v_lead_id
    AND lcq.quote_file_url IS NOT NULL  -- Only show quotes with files
    AND lcq.quote_file_url != ''  -- Not empty string
  ORDER BY lcq.created_at DESC;
END;
$$;

-- Grant access to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_lead_quotes_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_lead_quotes_by_token(text) TO authenticated;
