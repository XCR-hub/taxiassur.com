/*
  # Fix check_all_mandatory_companies_processed enum mismatch

  ## Summary
  The function referenced enum values ('sent', 'accepted', 'rejected') that do
  not exist in the `lead_company_quote_status` enum. This caused a 400 error
  every time the lead detail page checked mandatory company processing status.

  ## Changes
  1. Replace invalid enum values with the real ones:
     - 'sent'      -> 'quote_submitted'
     - 'accepted'  -> 'validated'
     - 'rejected'  -> 'refused'

  ## Security
  - Function remains SECURITY DEFINER with search_path locked to `public`.
  - No table or policy changes.
*/

CREATE OR REPLACE FUNCTION check_all_mandatory_companies_processed(p_lead_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mandatory_count integer;
  v_processed_count integer;
BEGIN
  SELECT COUNT(*) INTO v_mandatory_count
  FROM insurance_companies
  WHERE is_mandatory = true AND is_active = true;

  SELECT COUNT(DISTINCT q.company_id) INTO v_processed_count
  FROM lead_company_quotes q
  JOIN insurance_companies ic ON q.company_id = ic.id
  WHERE q.lead_id = p_lead_id
    AND ic.is_mandatory = true
    AND (q.status IN ('quote_submitted', 'validated', 'refused')
         OR q.refusal_reason IS NOT NULL);

  RETURN v_processed_count >= v_mandatory_count;
END;
$$;
