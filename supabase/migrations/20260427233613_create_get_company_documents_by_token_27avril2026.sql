/*
  # Get company documents by prospect token

  Allows the prospect space (anonymous, token-based) to fetch the
  contractual documents attached to insurance companies whose quotes
  are visible to the prospect.

  ## New function
  - `get_company_documents_by_token(p_token text, p_filter text default 'quote')`
    Returns rows from `company_documents` filtered by:
      - `send_with_quote = true` when p_filter = 'quote'
      - `send_with_contract = true` when p_filter = 'contract'
    Restricted to companies that already have at least one row in
    `lead_company_quotes` for the lead identified by p_token.

  ## Security
  - SECURITY DEFINER function. Token is validated against
    `crm_leads.access_token`. No direct table grant added; the
    existing RLS on `company_documents` keeps the table locked down.
*/

CREATE OR REPLACE FUNCTION public.get_company_documents_by_token(
  p_token text,
  p_filter text DEFAULT 'quote'
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  document_name text,
  document_type text,
  file_url text,
  mime_type text,
  description text,
  category text,
  display_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    cd.id,
    cd.company_id,
    cd.document_name,
    cd.document_type,
    cd.file_url,
    cd.mime_type,
    cd.description,
    cd.category,
    cd.display_order
  FROM company_documents cd
  WHERE cd.company_id IN (
    SELECT DISTINCT lcq.company_id
    FROM lead_company_quotes lcq
    WHERE lcq.lead_id = v_lead_id
      AND lcq.company_id IS NOT NULL
  )
  AND (
    (p_filter = 'quote' AND cd.send_with_quote = true)
    OR (p_filter = 'contract' AND cd.send_with_contract = true)
  )
  ORDER BY cd.display_order NULLS LAST, cd.document_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_documents_by_token(text, text) TO anon, authenticated;
