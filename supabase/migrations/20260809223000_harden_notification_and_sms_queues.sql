-- Harden notification/SMS queue locking and delivery timestamps.

ALTER TABLE public.sms_queue
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_sms_queue_processing_updated
  ON public.sms_queue(updated_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_crm_notification_queue_processing_updated
  ON public.crm_notification_queue(updated_at)
  WHERE status = 'processing';

ALTER TABLE public.sms_messages
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.sms_messages
  DROP CONSTRAINT IF EXISTS sms_messages_status_check;

ALTER TABLE public.sms_messages
  ADD CONSTRAINT sms_messages_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'received'));

CREATE INDEX IF NOT EXISTS idx_sms_messages_pending_outbound
  ON public.sms_messages(created_at)
  WHERE status = 'pending' AND direction = 'outbound';

CREATE INDEX IF NOT EXISTS idx_sms_messages_processing_updated
  ON public.sms_messages(updated_at)
  WHERE status = 'processing' AND direction = 'outbound';
WITH duplicate_provider_ids AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY direction, provider_message_id
           ORDER BY created_at, id
         ) AS duplicate_rank
  FROM public.sms_messages
  WHERE provider_message_id IS NOT NULL
)
UPDATE public.sms_messages AS message
SET provider_message_id = NULL
FROM duplicate_provider_ids AS duplicate
WHERE message.id = duplicate.id
  AND duplicate.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_messages_direction_provider_id
  ON public.sms_messages(direction, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.increment_wa_template_usage(p_template_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.wa_templates
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE id = p_template_id;
$$;

REVOKE ALL ON FUNCTION public.increment_wa_template_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wa_template_usage(uuid) TO service_role;