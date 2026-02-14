/*
  # Fix get_lead_quotes_by_token - Colonne code Manquante

  ## Problème
  La fonction get_lead_quotes_by_token essaie d'accéder à ic.code 
  qui n'existe pas dans insurance_companies

  ## Solution
  Utiliser ic.slug à la place de ic.code (ou retourner name)
*/

DROP FUNCTION IF EXISTS public.get_lead_quotes_by_token(text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_lead_quotes_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  company_id uuid,
  company_name text,
  company_logo_url text,
  company_code text,
  quote_file_url text,
  quote_amount numeric,
  status text,
  submitted_at timestamptz,
  last_sent_at timestamptz,
  quote_accepted_at timestamptz,
  refusal_reason text,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Trouver le lead
  SELECT cl.id INTO v_lead_id
  FROM crm_leads cl
  WHERE cl.access_token = p_token AND cl.deleted_at IS NULL
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  -- Retourner TOUS les devis qui ont un fichier PDF
  RETURN QUERY
  SELECT
    lcq.id,
    lcq.lead_id,
    lcq.insurance_company_id as company_id,
    COALESCE(ic.name, '') as company_name,
    COALESCE(ic.logo_url, '') as company_logo_url,
    COALESCE(ic.slug, '') as company_code,
    COALESCE(lcq.quote_pdf_url, '') as quote_file_url,
    lcq.quote_amount,
    COALESCE(lcq.quote_status, 'pending') as status,
    lcq.sent_at as submitted_at,
    lcq.last_sent_at,
    lcq.quote_accepted_at,
    lcq.refusal_reason,
    lcq.created_at,
    lcq.updated_at
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.lead_id = v_lead_id
    AND lcq.deleted_at IS NULL
    AND lcq.quote_pdf_url IS NOT NULL
    AND lcq.quote_pdf_url != ''
  ORDER BY lcq.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_quotes_by_token(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_lead_quotes_by_token(text) IS 
'Retourne tous les devis du lead via son access_token (FIXED: use slug instead of code)';