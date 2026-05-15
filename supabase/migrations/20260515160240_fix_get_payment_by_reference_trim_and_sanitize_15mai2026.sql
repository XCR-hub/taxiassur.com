/*
  # Fix payment reference lookup and sanitization

  1. Changes
    - Update get_payment_by_reference() to TRIM the input and search with trimmed DB values
    - This fixes URLs like /paiement/Vtc when the DB has "Vtc " (trailing space)

  2. Notes
    - Uses TRIM() on both input and stored reference for robust matching
    - Case-sensitive match preserved (references are user-facing)
*/

CREATE OR REPLACE FUNCTION get_payment_by_reference(p_reference text)
RETURNS TABLE (
  id          uuid,
  reference   text,
  amount      numeric,
  currency    text,
  status      text,
  customer_name   text,
  customer_email  text,
  customer_phone  text,
  description text,
  lead_id     uuid,
  created_at  timestamptz,
  paid_at     timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mp.id,
    mp.reference,
    mp.amount,
    mp.currency,
    mp.status,
    mp.customer_name,
    mp.customer_email,
    mp.customer_phone,
    mp.description,
    mp.lead_id,
    mp.created_at,
    mp.payment_date AS paid_at
  FROM monetico_payments mp
  WHERE TRIM(mp.reference) = TRIM(p_reference)
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_payment_by_reference(text) TO anon;
GRANT EXECUTE ON FUNCTION get_payment_by_reference(text) TO authenticated;
