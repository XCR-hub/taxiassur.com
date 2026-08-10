-- Limit the anonymous payment lookup to fields required by the public payment page.
-- The return signature stays compatible so existing clients continue to work.
CREATE OR REPLACE FUNCTION public.get_payment_by_reference(p_reference text)
RETURNS TABLE (
  id uuid,
  reference text,
  amount numeric,
  currency text,
  status text,
  customer_name text,
  customer_email text,
  customer_phone text,
  description text,
  lead_id uuid,
  created_at timestamptz,
  paid_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_reference text := btrim(p_reference);
BEGIN
  IF normalized_reference !~ '^[A-Za-z0-9_-]{1,50}$' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    NULL::uuid,
    mp.reference,
    mp.amount,
    mp.currency,
    mp.status,
    NULL::text,
    NULL::text,
    NULL::text,
    mp.description,
    NULL::uuid,
    mp.created_at,
    mp.payment_date
  FROM public.monetico_payments AS mp
  WHERE btrim(mp.reference) = normalized_reference
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_payment_by_reference(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_by_reference(text) TO anon, authenticated, service_role;