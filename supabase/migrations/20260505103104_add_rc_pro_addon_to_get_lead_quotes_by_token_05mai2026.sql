/*
  # Expose RC Pro Swisslife addon to prospect via get_lead_quotes_by_token

  1. Changes
    - Add RC Pro addon fields (rc_pro_addon, rc_pro_addon_annual, rc_pro_addon_monthly,
      rc_pro_addon_file_url, rc_pro_addon_company_name) to the RPC return type.
    - Join insurance_companies a second time for the Swisslife addon name.

  2. Security
    - Still SECURITY DEFINER with search_path locked, token-gated.
*/

DROP FUNCTION IF EXISTS public.get_lead_quotes_by_token(text);

CREATE OR REPLACE FUNCTION public.get_lead_quotes_by_token(p_token text)
RETURNS TABLE(
  id uuid,
  lead_id uuid,
  company_id uuid,
  company_name text,
  company_logo_url text,
  company_code text,
  quote_file_url text,
  quote_amount numeric,
  monthly_price numeric,
  coverage_type text,
  includes_immobilisation boolean,
  includes_assistance_0km boolean,
  includes_rc_pro boolean,
  includes_depannage_remorquage boolean,
  coverage_details text,
  status text,
  submitted_at timestamptz,
  last_sent_at timestamptz,
  quote_accepted_at timestamptz,
  refusal_reason text,
  created_at timestamptz,
  updated_at timestamptz,
  rc_pro_addon boolean,
  rc_pro_addon_annual numeric,
  rc_pro_addon_monthly numeric,
  rc_pro_addon_file_url text,
  rc_pro_addon_company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  SELECT cl.id INTO v_lead_id
  FROM crm_leads cl
  WHERE cl.access_token = p_token
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    lcq.id,
    lcq.lead_id,
    lcq.insurance_company_id AS company_id,
    COALESCE(ic.name, '') AS company_name,
    COALESCE(ic.logo_url, '') AS company_logo_url,
    COALESCE(ic.code, '') AS company_code,
    COALESCE(lcq.quote_pdf_url, lcq.quote_file_url, '') AS quote_file_url,
    lcq.quote_amount,
    lcq.monthly_price,
    lcq.coverage_type,
    COALESCE(lcq.includes_immobilisation, false) AS includes_immobilisation,
    COALESCE(lcq.includes_assistance_0km, true) AS includes_assistance_0km,
    COALESCE(lcq.includes_rc_pro, true) AS includes_rc_pro,
    COALESCE(lcq.includes_depannage_remorquage, true) AS includes_depannage_remorquage,
    lcq.coverage_details,
    COALESCE(lcq.quote_status::text, lcq.status::text, 'pending') AS status,
    COALESCE(lcq.sent_at, lcq.submitted_at) AS submitted_at,
    lcq.last_sent_at,
    lcq.quote_accepted_at,
    lcq.refusal_reason,
    lcq.created_at,
    lcq.updated_at,
    COALESCE(lcq.rc_pro_addon, false) AS rc_pro_addon,
    lcq.rc_pro_addon_annual,
    lcq.rc_pro_addon_monthly,
    lcq.rc_pro_addon_file_url,
    COALESCE(ic_rc.name, 'Swisslife RC Pro') AS rc_pro_addon_company_name
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  LEFT JOIN insurance_companies ic_rc ON ic_rc.id = lcq.rc_pro_addon_company_id
  WHERE lcq.lead_id = v_lead_id
    AND (lcq.quote_pdf_url IS NOT NULL OR lcq.quote_file_url IS NOT NULL)
  ORDER BY lcq.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_quotes_by_token(text) TO anon, authenticated;