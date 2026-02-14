/*
  # Fix get_lead_quotes_by_token - Colonnes correctes
  
  1. Problème
    - La fonction utilise les anciennes colonnes qui n'existent plus
    - company_id → insurance_company_id
    - quote_file_url → quote_pdf_url
    - status → quote_status
    - submitted_at → sent_at
  
  2. Solution
    - Recréer la fonction avec les BONNES colonnes
*/

DROP FUNCTION IF EXISTS get_lead_quotes_by_token(text);

CREATE OR REPLACE FUNCTION get_lead_quotes_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  insurance_company_id uuid,
  company_name text,
  company_logo_url text,
  quote_pdf_url text,
  quote_amount numeric,
  quote_status text,
  sent_at timestamptz,
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
    lcq.insurance_company_id,
    ic.name as company_name,
    ic.logo_url as company_logo_url,
    lcq.quote_pdf_url,
    lcq.quote_amount,
    lcq.quote_status,
    lcq.sent_at,
    lcq.last_sent_at,
    lcq.created_at
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.lead_id = v_lead_id
    AND lcq.quote_pdf_url IS NOT NULL  -- Only show quotes with files
    AND lcq.quote_pdf_url != ''  -- Not empty string
  ORDER BY lcq.created_at DESC;
END;
$$;

-- Grant access to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_lead_quotes_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_lead_quotes_by_token(text) TO authenticated;

COMMENT ON FUNCTION get_lead_quotes_by_token(text) IS 
'Récupère les devis pour un prospect via son token d''accès (colonnes correctes)';