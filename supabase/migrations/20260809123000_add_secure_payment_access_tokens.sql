ALTER TABLE public.monetico_payments
ADD COLUMN IF NOT EXISTS payment_access_token text;

UPDATE public.monetico_payments
SET payment_access_token = encode(gen_random_bytes(32), 'hex')
WHERE payment_access_token IS NULL
   OR payment_access_token !~ '^[0-9a-f]{64}$';

ALTER TABLE public.monetico_payments
ALTER COLUMN payment_access_token SET DEFAULT encode(gen_random_bytes(32), 'hex'),
ALTER COLUMN payment_access_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS monetico_payments_access_token_uidx
ON public.monetico_payments (payment_access_token);

DROP FUNCTION IF EXISTS public.get_payment_by_access(text, text);
CREATE FUNCTION public.get_payment_by_access(
  p_reference text,
  p_access_token text
)
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM public.monetico_payments mp
  LEFT JOIN public.crm_leads lead ON lead.id = mp.lead_id
  WHERE btrim(mp.reference) = btrim(p_reference)
    AND btrim(p_reference) ~ '^[A-Za-z0-9_-]{8,50}$'
    AND p_access_token ~ '^[0-9a-fA-F]{64}$'
    AND (
      mp.payment_access_token = lower(p_access_token)
      OR lead.access_token = lower(p_access_token)
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_payment_by_reference(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_by_reference(text) TO service_role;

REVOKE ALL ON FUNCTION public.get_payment_by_access(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_by_access(text, text)
TO anon, authenticated, service_role;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lead_contracts'
      AND column_name = 'down_payment_link'
  ) THEN
    EXECUTE $sql$
      UPDATE public.lead_contracts contract
      SET down_payment_link = payment.reference || '?token=' || payment.payment_access_token
      FROM public.monetico_payments payment
      WHERE contract.down_payment_link IS NOT NULL
        AND contract.down_payment_link NOT LIKE '%?token=%'
        AND btrim(contract.down_payment_link) = btrim(payment.reference)
        AND payment.status IN ('pending', 'sent', 'processing')
    $sql$;
  END IF;
END
 $block$;