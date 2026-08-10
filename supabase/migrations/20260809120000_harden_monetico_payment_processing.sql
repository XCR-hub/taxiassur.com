CREATE TABLE IF NOT EXISTS public.monetico_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.monetico_payments(id) ON DELETE CASCADE,
  reference text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'cancelled')),
  transaction_id text,
  response_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS monetico_webhook_events_dedupe_uidx
ON public.monetico_webhook_events (
  payment_id,
  status,
  COALESCE(transaction_id, '')
);

ALTER TABLE public.monetico_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS monetico_webhook_events_staff_select ON public.monetico_webhook_events;
CREATE POLICY monetico_webhook_events_staff_select
ON public.monetico_webhook_events
FOR SELECT
TO authenticated
USING (true);

REVOKE ALL ON TABLE public.monetico_webhook_events FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.monetico_webhook_events FROM authenticated;
GRANT SELECT ON TABLE public.monetico_webhook_events TO authenticated;
GRANT ALL ON TABLE public.monetico_webhook_events TO service_role;
CREATE OR REPLACE FUNCTION public.process_monetico_payment(
  p_reference text,
  p_status text,
  p_transaction_id text DEFAULT NULL,
  p_response_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.monetico_payments%ROWTYPE;
BEGIN
  IF p_reference IS NULL OR p_reference !~ '^[A-Za-z0-9_-]{8,50}$' THEN
    RAISE EXCEPTION 'invalid payment reference';
  END IF;
  IF p_status NOT IN ('success', 'cancelled') THEN
    RAISE EXCEPTION 'invalid payment status';
  END IF;
  IF p_transaction_id IS NOT NULL AND (
    length(p_transaction_id) > 100 OR p_transaction_id !~ '^[A-Za-z0-9_-]+$'
  ) THEN
    RAISE EXCEPTION 'invalid transaction identifier';
  END IF;

  SELECT *
  INTO v_payment
  FROM public.monetico_payments
  WHERE reference = p_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found';
  END IF;

  -- A confirmed payment is terminal and cannot be downgraded by a late callback.
  IF v_payment.status = 'success' THEN
    IF p_status = 'success'
       AND (v_payment.transaction_id IS NULL OR p_transaction_id IS NULL OR v_payment.transaction_id = p_transaction_id) THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'payment already confirmed';
  END IF;

  IF v_payment.transaction_id IS NOT NULL
     AND p_transaction_id IS NOT NULL
     AND v_payment.transaction_id <> p_transaction_id THEN
    RAISE EXCEPTION 'transaction identifier conflict';
  END IF;

  UPDATE public.monetico_payments
  SET
    status = p_status,
    transaction_id = COALESCE(transaction_id, p_transaction_id),
    monetico_data = COALESCE(p_response_data, monetico_data),
    payment_date = CASE WHEN p_status = 'success' THEN now() ELSE payment_date END,
    updated_at = now()
  WHERE id = v_payment.id;

  INSERT INTO public.monetico_webhook_events (
    payment_id, reference, status, transaction_id, response_data
  ) VALUES (
    v_payment.id, p_reference, p_status, p_transaction_id, COALESCE(p_response_data, '{}'::jsonb)
  )
  ON CONFLICT DO NOTHING;

  IF p_status = 'success' AND v_payment.lead_id IS NOT NULL THEN
    UPDATE public.crm_leads
    SET pipeline_stage = 'paiement_recu', updated_at = now()
    WHERE id = v_payment.lead_id;

    IF v_payment.created_by IS NOT NULL THEN
      INSERT INTO public.crm_event_notifications (
        lead_id, event_type, title, message, priority, action_url, context_data
      ) VALUES (
        v_payment.lead_id,
        'payment_received',
        'Paiement recu',
        'Paiement confirme',
        1,
        '/backoffice/crm-killer/' || v_payment.lead_id,
        jsonb_build_object(
          'payment_id', v_payment.id,
          'reference', p_reference,
          'amount', v_payment.amount,
          'transaction_id', p_transaction_id
        )
      );
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.process_monetico_payment(text, text, text, jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_monetico_payment(text, text, text, jsonb)
TO service_role;