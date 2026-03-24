/*
  # Fix payment page access - RPC approach (secure)

  ## Problem
  The broad SELECT policy added previously would expose all payment rows to anon
  users. Instead, we use an RPC function (SECURITY DEFINER) that only returns
  the single payment matching the provided reference. This is the same pattern
  as get_lead_by_token.

  ## Changes
  1. Drop the overly-permissive policy added previously
  2. Create get_payment_by_reference() RPC - returns one row safely
*/

-- 1. Remove the too-permissive policy
DROP POLICY IF EXISTS "Public can view payment by reference" ON monetico_payments;

-- 2. Create a secure RPC that the public payment page can call
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
  WHERE mp.reference = p_reference
  LIMIT 1;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION get_payment_by_reference(text) TO anon;
GRANT EXECUTE ON FUNCTION get_payment_by_reference(text) TO authenticated;
