CREATE TABLE IF NOT EXISTS public.outreach_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 320),
  source text NOT NULL DEFAULT 'unsubscribe',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.outreach_delivery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid,
  campaign_id uuid,
  recipient_email text NOT NULL CHECK (recipient_email = lower(btrim(recipient_email)) AND length(recipient_email) BETWEEN 3 AND 320),
  recipient_name text,
  recipient_website text,
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  body_text text NOT NULL CHECK (length(body_text) BETWEEN 1 AND 20000),
  idempotency_key text NOT NULL UNIQUE CHECK (length(idempotency_key) BETWEEN 16 AND 200),
  unsubscribe_token text CHECK (unsubscribe_token IS NULL OR unsubscribe_token ~ '^[0-9a-f]{64}$'),
  unsubscribe_token_hash text NOT NULL UNIQUE CHECK (unsubscribe_token_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','suppressed','delivery_uncertain')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 20),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_delivery_queue_ready
  ON public.outreach_delivery_queue (next_attempt_at, created_at)
  WHERE status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS idx_outreach_delivery_queue_recipient
  ON public.outreach_delivery_queue (recipient_email, created_at DESC);

ALTER TABLE public.outreach_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_delivery_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.outreach_suppressions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.outreach_delivery_queue FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.outreach_suppressions TO service_role;
GRANT ALL ON public.outreach_delivery_queue TO service_role;

CREATE OR REPLACE FUNCTION public.claim_outreach_deliveries(p_limit integer DEFAULT 10)
RETURNS SETOF public.outreach_delivery_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service_role required' USING ERRCODE = '42501';
  END IF;
  p_limit := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
  UPDATE public.outreach_delivery_queue q
  SET status = 'suppressed', unsubscribe_token = NULL, updated_at = now()
  WHERE q.status IN ('pending','failed')
    AND EXISTS (SELECT 1 FROM public.outreach_suppressions s WHERE s.email = q.recipient_email);
  RETURN QUERY
  WITH selected AS (
    SELECT q.id
    FROM public.outreach_delivery_queue q
    WHERE q.status IN ('pending','failed')
      AND q.attempts < 5
      AND q.next_attempt_at <= now()
      AND NOT EXISTS (SELECT 1 FROM public.outreach_suppressions s WHERE s.email = q.recipient_email)
    ORDER BY q.next_attempt_at, q.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.outreach_delivery_queue q
  SET status = 'sending', claimed_at = now(), attempts = q.attempts + 1, updated_at = now()
  FROM selected
  WHERE q.id = selected.id
  RETURNING q.*;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_outreach_deliveries(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outreach_deliveries(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.release_stale_outreach_deliveries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE v_count integer;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service_role required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.outreach_delivery_queue
  SET status = 'failed', next_attempt_at = now() + interval '15 minutes', last_error = 'stale_claim', updated_at = now()
  WHERE status = 'sending' AND claimed_at < now() - interval '10 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.release_stale_outreach_deliveries() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stale_outreach_deliveries() TO service_role;
