ALTER TABLE public.monetico_payments
  DROP CONSTRAINT IF EXISTS monetico_payments_status_check;

ALTER TABLE public.monetico_payments
  ADD CONSTRAINT monetico_payments_status_check
  CHECK (status IN (
    'pending', 'processing', 'sent', 'delivery_uncertain',
    'success', 'failed', 'cancelled', 'refunded'
  ));

COMMENT ON COLUMN public.monetico_payments.status IS
  'Payment lifecycle and payment-link e-mail delivery state. delivery_uncertain requires manual reconciliation before retry.';