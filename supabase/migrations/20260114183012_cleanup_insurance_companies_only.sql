/*
  # Cleanup Insurance Companies - TaxiAssur 5 Mandatory Companies

  1. Changes
    - Remove duplicate insurance company entries
    - Set exactly 5 mandatory companies as per TaxiAssur specification:
      - GENERALI
      - MFA (2MA)
      - +Simple
      - Solly Azar
      - ZEPHIR

  2. Purpose
    - TaxiAssur requires quotes from 5 specific insurance companies
    - Each company must have either a quote OR a refusal with mandatory reason
*/

DELETE FROM insurance_companies WHERE code IN ('2MA', 'PLUSSIMPLE', 'SOLLYAZAR', 'ZEPHYR');

UPDATE insurance_companies SET 
  name = 'Generali',
  is_mandatory = true,
  is_active = true
WHERE code = 'GENERALI';

UPDATE insurance_companies SET 
  name = 'MFA (2MA)',
  is_mandatory = true,
  is_active = true
WHERE code = 'MFA';

UPDATE insurance_companies SET 
  name = '+Simple',
  is_mandatory = true,
  is_active = true
WHERE code = 'PLUS_SIMPLE';

UPDATE insurance_companies SET 
  name = 'Solly Azar',
  is_mandatory = true,
  is_active = true
WHERE code = 'SOLLY_AZAR';

UPDATE insurance_companies SET 
  name = 'Zephir',
  is_mandatory = true,
  is_active = true
WHERE code = 'ZEPHIR';

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
    AND (q.status IN ('sent', 'accepted', 'rejected') OR q.refusal_reason IS NOT NULL);

  RETURN v_processed_count >= v_mandatory_count;
END;
$$;
