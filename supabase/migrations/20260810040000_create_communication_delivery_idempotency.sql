CREATE TABLE IF NOT EXISTS public.communication_delivery_requests (
  request_id uuid PRIMARY KEY,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'sent', 'failed', 'uncertain')),
  provider_id text,
  response_payload jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.communication_delivery_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.communication_delivery_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.communication_delivery_requests TO service_role;

CREATE INDEX IF NOT EXISTS communication_delivery_status_updated_idx
  ON public.communication_delivery_requests (status, updated_at);

COMMENT ON TABLE public.communication_delivery_requests IS
  'Private idempotency ledger for outbound email, SMS and WhatsApp provider calls.';
COMMENT ON COLUMN public.communication_delivery_requests.status IS
  'uncertain prevents an automatic retry when a provider may have accepted the message before a timeout.';
-- send-crm-email claims an audit row before contacting Brevo. The original
-- tracking constraint did not include this operational state.
ALTER TABLE public.email_sends
  DROP CONSTRAINT IF EXISTS email_sends_status_check;
ALTER TABLE public.email_sends
  ADD CONSTRAINT email_sends_status_check
  CHECK (status IN (
    'processing', 'sent', 'delivered', 'bounced', 'failed',
    'opened', 'clicked', 'replied', 'delivery_uncertain'
  ));
