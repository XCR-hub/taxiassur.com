CREATE TABLE IF NOT EXISTS public.claim_notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.crm_claims(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('new_claim', 'status_update')),
  event_key text NOT NULL CHECK (event_key ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'sent', 'failed')),
  delivered_count integer NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  team_sent_at timestamptz,
  client_sent_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  UNIQUE (event_key)
);
ALTER TABLE public.claim_notification_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can read claim notification audit" ON public.claim_notification_events;
CREATE POLICY "Staff can read claim notification audit" ON public.claim_notification_events FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.claim_notification_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.claim_notification_events TO authenticated;
GRANT ALL ON public.claim_notification_events TO service_role;
CREATE INDEX IF NOT EXISTS idx_claim_notification_events_claim_created ON public.claim_notification_events (claim_id, created_at DESC);