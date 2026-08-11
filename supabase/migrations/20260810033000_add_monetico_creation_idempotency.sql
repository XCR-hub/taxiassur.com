-- Prevent duplicate Monetico payment creation when a browser retries after a timeout.
ALTER TABLE public.monetico_payments
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS request_fingerprint text;

CREATE UNIQUE INDEX IF NOT EXISTS monetico_payments_request_id_uidx
  ON public.monetico_payments (request_id)
  WHERE request_id IS NOT NULL;

ALTER TABLE public.monetico_payments
  DROP CONSTRAINT IF EXISTS monetico_payments_request_fingerprint_format;

ALTER TABLE public.monetico_payments
  ADD CONSTRAINT monetico_payments_request_fingerprint_format
  CHECK (request_fingerprint IS NULL OR request_fingerprint ~ '^[0-9a-f]{64}$');

COMMENT ON COLUMN public.monetico_payments.request_id IS
  'Browser-generated UUID used to make payment creation retries idempotent.';
COMMENT ON COLUMN public.monetico_payments.request_fingerprint IS
  'SHA-256 of immutable payment creation inputs; prevents request-id reuse with different data.';
