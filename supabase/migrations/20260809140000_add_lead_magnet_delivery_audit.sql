CREATE TABLE IF NOT EXISTS public.lead_magnet_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash text NOT NULL CHECK (email_hash ~ '^[0-9a-f]{64}$'),
  guide_type text NOT NULL CHECK (guide_type IN ('guide-complet', 'checklist-documents')),
  delivery_day date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  failed_at timestamptz,
  UNIQUE (email_hash, guide_type, delivery_day)
);
ALTER TABLE public.lead_magnet_delivery_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_magnet_delivery_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lead_magnet_delivery_events TO service_role;
CREATE INDEX IF NOT EXISTS idx_lead_magnet_delivery_created
  ON public.lead_magnet_delivery_events (created_at DESC);
