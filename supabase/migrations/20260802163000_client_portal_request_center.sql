/*
  Client portal request center and consent-safe cross-sell tracking.

  This extends the existing lead_client_requests workflow for post-contract
  client operations: contract questions, endorsements, fleet changes, renewal,
  document/certificate requests, payment questions and support messages.

  The consent snapshot stores only explicit choices made in the client app.
  It does not allow hidden contact import, mailbox scraping or browser history
  collection.
*/

BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_client_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  contract_id uuid,
  request_type text NOT NULL,
  title text NOT NULL,
  description text,
  current_data jsonb,
  new_data jsonb,
  status text DEFAULT 'pending',
  assigned_to uuid,
  response text,
  resolved_at timestamptz,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.lead_client_requests
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'client_portal',
  ADD COLUMN IF NOT EXISTS consent_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT true;

ALTER TABLE public.lead_client_requests
  DROP CONSTRAINT IF EXISTS lead_client_requests_request_type_check;

ALTER TABLE public.lead_client_requests
  ADD CONSTRAINT lead_client_requests_request_type_check CHECK (request_type IN (
    'address_change',
    'vehicle_change',
    'fleet_change',
    'payment_change',
    'contact_change',
    'claim_declaration',
    'document_request',
    'certificate_request',
    'cancellation',
    'coverage_change',
    'endorsement_request',
    'renewal_request',
    'premium_question',
    'contract_question',
    'support_message',
    'partner_offer_question',
    'other'
  ));

ALTER TABLE public.lead_client_requests
  DROP CONSTRAINT IF EXISTS lead_client_requests_status_check;

ALTER TABLE public.lead_client_requests
  ADD CONSTRAINT lead_client_requests_status_check CHECK (status IN (
    'pending', 'in_progress', 'completed', 'rejected', 'cancelled'
  ));

ALTER TABLE public.lead_client_requests
  DROP CONSTRAINT IF EXISTS lead_client_requests_priority_check;

ALTER TABLE public.lead_client_requests
  ADD CONSTRAINT lead_client_requests_priority_check CHECK (priority IN (
    'low', 'normal', 'high', 'urgent'
  ));

CREATE INDEX IF NOT EXISTS idx_lead_client_requests_email_created
  ON public.lead_client_requests(lower(client_email), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_client_requests_client_visible
  ON public.lead_client_requests(lead_id, client_visible, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_client_requests_source
  ON public.lead_client_requests(source);

CREATE OR REPLACE FUNCTION public.resolve_client_portal_lead(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(COALESCE(p_email, '')));
  v_portal record;
  v_lead record;
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'Email requis';
  END IF;

  SELECT id, lead_id, email, is_active
  INTO v_portal
  FROM public.client_portal_users
  WHERE lower(email) = v_email
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_portal.id IS NOT NULL AND COALESCE(v_portal.is_active, true) IS false THEN
    RAISE EXCEPTION 'Compte client desactive';
  END IF;

  IF v_portal.lead_id IS NOT NULL THEN
    SELECT id, email, first_name, last_name, phone
    INTO v_lead
    FROM public.crm_leads
    WHERE id = v_portal.lead_id
    LIMIT 1;
  END IF;

  IF v_lead.id IS NULL THEN
    SELECT id, email, first_name, last_name, phone
    INTO v_lead
    FROM public.crm_leads
    WHERE lower(email) = v_email
    ORDER BY COALESCE(client_since, updated_at, created_at) DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Client introuvable';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_lead.id,
    'portal_user_id', v_portal.id,
    'email', lower(trim(COALESCE(v_lead.email, v_email))),
    'first_name', v_lead.first_name,
    'last_name', v_lead.last_name,
    'phone', v_lead.phone
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_client_portal_request(
  p_email text,
  p_request_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_new_data jsonb DEFAULT '{}'::jsonb,
  p_consent_snapshot jsonb DEFAULT '{}'::jsonb,
  p_priority text DEFAULT 'normal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client jsonb;
  v_email text;
  v_lead_id uuid;
  v_request_id uuid;
  v_title text := trim(COALESCE(p_title, ''));
  v_description text := trim(COALESCE(p_description, ''));
  v_priority text := COALESCE(NULLIF(p_priority, ''), 'normal');
BEGIN
  IF v_title = '' THEN
    RAISE EXCEPTION 'Titre requis';
  END IF;

  IF p_request_type NOT IN (
    'address_change', 'vehicle_change', 'fleet_change', 'payment_change',
    'contact_change', 'claim_declaration', 'document_request',
    'certificate_request', 'cancellation', 'coverage_change',
    'endorsement_request', 'renewal_request', 'premium_question',
    'contract_question', 'support_message', 'partner_offer_question', 'other'
  ) THEN
    RAISE EXCEPTION 'Type de demande invalide';
  END IF;

  IF v_priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
    v_priority := 'normal';
  END IF;

  v_client := public.resolve_client_portal_lead(p_email);
  v_lead_id := (v_client->>'lead_id')::uuid;
  v_email := lower(trim(v_client->>'email'));

  INSERT INTO public.lead_client_requests (
    lead_id,
    request_type,
    title,
    description,
    new_data,
    status,
    client_email,
    source,
    consent_snapshot,
    priority,
    client_visible
  )
  VALUES (
    v_lead_id,
    p_request_type,
    v_title,
    NULLIF(v_description, ''),
    COALESCE(p_new_data, '{}'::jsonb) || jsonb_build_object('created_from', 'client_portal'),
    'pending',
    v_email,
    'client_portal',
    COALESCE(p_consent_snapshot, '{}'::jsonb) || jsonb_build_object(
      'wording_version', 'client_requests_2026_08',
      'captured_at', now()
    ),
    v_priority,
    true
  )
  RETURNING id INTO v_request_id;

  IF to_regclass('public.crm_automation_events') IS NOT NULL THEN
    INSERT INTO public.crm_automation_events (
      lead_id,
      event_type,
      event_source,
      event_data,
      processed
    )
    VALUES (
      v_lead_id,
      'client_portal_request',
      'client_portal',
      jsonb_build_object(
        'request_id', v_request_id,
        'request_type', p_request_type,
        'title', v_title,
        'priority', v_priority
      ),
      false
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'lead_id', v_lead_id,
    'email', v_email
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_portal_requests(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client jsonb;
  v_lead_id uuid;
  v_requests jsonb;
BEGIN
  v_client := public.resolve_client_portal_lead(p_email);
  v_lead_id := (v_client->>'lead_id')::uuid;

  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_requests
  FROM (
    SELECT
      id,
      request_type,
      title,
      description,
      status,
      priority,
      response,
      new_data,
      consent_snapshot,
      created_at,
      updated_at,
      resolved_at
    FROM public.lead_client_requests
    WHERE lead_id = v_lead_id
      AND client_visible IS true
    ORDER BY created_at DESC
    LIMIT 50
  ) r;

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'email', v_client->>'email',
    'requests', COALESCE(v_requests, '[]'::jsonb)
  );
END;
$$;


CREATE TABLE IF NOT EXISTS public.client_portal_access_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  email text NOT NULL,
  event_type text NOT NULL DEFAULT 'send_client_access',
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT client_portal_access_outbox_status_check CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled'))
);

ALTER TABLE public.client_portal_access_outbox ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3;
ALTER TABLE public.client_portal_access_outbox ADD COLUMN IF NOT EXISTS scheduled_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_portal_access_outbox_pending_lead
  ON public.client_portal_access_outbox(lead_id)
  WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_client_portal_access_outbox_status_created
  ON public.client_portal_access_outbox(status, created_at);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_outbox_status_scheduled
  ON public.client_portal_access_outbox(status, scheduled_at, created_at);

ALTER TABLE public.client_portal_access_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages client portal access outbox" ON public.client_portal_access_outbox;
CREATE POLICY "Service role manages client portal access outbox"
  ON public.client_portal_access_outbox
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enqueue_client_app_access(
  p_lead_id uuid,
  p_source text DEFAULT 'contract_finalization'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access jsonb;
  v_email text;
BEGIN
  IF p_lead_id IS NULL THEN
    RAISE EXCEPTION 'Lead requis';
  END IF;

  v_access := public.ensure_client_app_access(p_lead_id);
  v_email := lower(trim(COALESCE(v_access->>'email', '')));

  IF v_email = '' THEN
    RAISE EXCEPTION 'Email client introuvable';
  END IF;

  INSERT INTO public.client_portal_access_outbox (
    lead_id,
    email,
    event_type,
    status,
    scheduled_at,
    max_attempts,
    metadata
  )
  VALUES (
    p_lead_id,
    v_email,
    'send_client_access',
    'pending',
    now(),
    3,
    jsonb_build_object('source', COALESCE(NULLIF(p_source, ''), 'contract_finalization'), 'queued_at', now())
  )
  ON CONFLICT (lead_id) WHERE status IN ('pending', 'processing')
  DO UPDATE SET
    email = EXCLUDED.email,
    metadata = public.client_portal_access_outbox.metadata || EXCLUDED.metadata,
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'lead_id', p_lead_id, 'email', v_email);
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_client_app_access_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text := lower(COALESCE(to_jsonb(NEW)->>'status', ''));
  v_should_enable boolean;
BEGIN
  v_should_enable := NULLIF(to_jsonb(NEW)->>'signed_at', '') IS NOT NULL
    OR v_status IN ('active', 'signed', 'signe', 'contrat_signe', 'client_actif', 'validated', 'completed');

  IF NEW.lead_id IS NOT NULL AND v_should_enable THEN
    BEGIN
      PERFORM public.enqueue_client_app_access(NEW.lead_id, 'lead_contracts_trigger');
    EXCEPTION WHEN others THEN
      RAISE WARNING 'Client app access enqueue failed for lead %: %', NEW.lead_id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_client_app_access_from_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb := to_jsonb(NEW);
  v_stage text := lower(COALESCE(v_row->>'pipeline_stage', v_row->>'workflow_stage', v_row->>'status', v_row->>'current_stage_key', ''));
BEGIN
  IF NEW.id IS NOT NULL AND v_stage IN ('client_actif', 'contrat_signe', 'client', 'converted', 'won', 'active') THEN
    BEGIN
      PERFORM public.enqueue_client_app_access(NEW.id, 'crm_leads_trigger');
    EXCEPTION WHEN others THEN
      RAISE WARNING 'Client app access enqueue failed for lead %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.lead_contracts') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_enqueue_client_app_access_from_contract ON public.lead_contracts;
    CREATE TRIGGER trg_enqueue_client_app_access_from_contract
      AFTER INSERT OR UPDATE ON public.lead_contracts
      FOR EACH ROW EXECUTE FUNCTION public.enqueue_client_app_access_from_contract();
  END IF;

  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_enqueue_client_app_access_from_lead ON public.crm_leads;
    CREATE TRIGGER trg_enqueue_client_app_access_from_lead
      AFTER INSERT OR UPDATE ON public.crm_leads
      FOR EACH ROW EXECUTE FUNCTION public.enqueue_client_app_access_from_lead();
  END IF;
END $$;

DO $$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_command text;
BEGIN
  IF to_regnamespace('cron') IS NULL OR to_regnamespace('net') IS NULL THEN
    RAISE NOTICE 'pg_cron or pg_net unavailable: process-client-access-outbox must be scheduled externally';
  ELSE
    BEGIN
      SELECT value INTO v_supabase_url
      FROM public.system_config
      WHERE key = 'supabase_url'
      LIMIT 1;

      SELECT value INTO v_service_key
      FROM public.system_config
      WHERE key IN ('supabase_service_role_key', 'service_role_key')
      ORDER BY CASE WHEN key = 'supabase_service_role_key' THEN 0 ELSE 1 END
      LIMIT 1;
    EXCEPTION WHEN undefined_table THEN
      v_supabase_url := current_setting('app.settings.supabase_url', true);
      v_service_key := current_setting('app.settings.supabase_service_role_key', true);
    END;

    IF COALESCE(NULLIF(v_supabase_url, ''), '') = '' OR COALESCE(NULLIF(v_service_key, ''), '') = '' THEN
      RAISE NOTICE 'Missing supabase_url or service role key: process-client-access-outbox cron not installed';
    ELSE
      BEGIN
        EXECUTE 'SELECT cron.unschedule(''process-client-access-outbox'')';
      EXCEPTION WHEN others THEN
        NULL;
      END;

      v_command := format(
        'SELECT net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || %L), body := jsonb_build_object(''limit'', 20), timeout_milliseconds := 30000);',
        rtrim(v_supabase_url, '/') || '/functions/v1/process-client-access-outbox',
        v_service_key
      );

      EXECUTE format(
        'SELECT cron.schedule(%L, %L, %L)',
        'process-client-access-outbox',
        '*/5 * * * *',
        v_command
      );
    END IF;
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.resolve_client_portal_lead(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_client_portal_request(text, text, text, text, jsonb, jsonb, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_portal_requests(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_client_app_access(uuid, text) TO authenticated, service_role;

COMMIT;
