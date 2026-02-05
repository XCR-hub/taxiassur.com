/*
  # Fix Prospect Quotes Access via Token - 2026

  1. Functions
    - Create RPC function to get quotes by token
    - Allows prospects to see their quotes using access_token

  2. Security
    - Public access via RPC with token validation
    - No direct table access required
*/

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_lead_quotes_by_token(text);

-- Create function to get quotes by token
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

  -- Return quotes with company info
  RETURN QUERY
  SELECT 
    lcq.id,
    lcq.lead_id,
    lcq.company_id,
    ic.name as company_name,
    ic.logo_url as company_logo_url,
    lcq.quote_file_url,
    lcq.quote_amount,
    lcq.status,
    lcq.submitted_at,
    lcq.last_sent_at,
    lcq.created_at
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.company_id
  WHERE lcq.lead_id = v_lead_id
    AND lcq.quote_file_url IS NOT NULL  -- Only show quotes with files
  ORDER BY lcq.created_at DESC;
END;
$$;

-- Grant access to anon role
GRANT EXECUTE ON FUNCTION get_lead_quotes_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_lead_quotes_by_token(text) TO authenticated;
