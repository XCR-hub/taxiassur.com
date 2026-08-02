/*
  Insurer dossier workflow.

  Backoffice users create a dossier send request with an explicit insurer
  recipient and a selected list of documents. A service-role worker sends the
  email, stores the result, and schedules J+2 / J+5 follow-ups when no response
  has been marked.

  This workflow is intentionally consent-safe. It does not allow hidden contact
  import, mailbox scraping, browser history collection, or covert retargeting.
*/

BEGIN;

CREATE TABLE IF NOT EXISTS public.insurer_dossier_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  insurance_company_id uuid REFERENCES public.insurance_companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.insurance_company_contacts(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  company_name text,
  subject text NOT NULL,
  message text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  send_type text NOT NULL DEFAULT 'initial',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  followup_step integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_followup_at timestamptz,
  next_followup_at timestamptz,
  processed_at timestamptz,
  last_error text,
  created_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.insurer_dossier_sends
  ADD COLUMN IF NOT EXISTS send_type text NOT NULL DEFAULT 'initial',
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_step integer NOT NULL DEFAULT 0;

ALTER TABLE public.insurer_dossier_sends
  DROP CONSTRAINT IF EXISTS insurer_dossier_sends_status_check;

ALTER TABLE public.insurer_dossier_sends
  ADD CONSTRAINT insurer_dossier_sends_status_check CHECK (status IN (
    'pending', 'processing', 'sent', 'failed', 'cancelled', 'closed', 'responded'
  ));

ALTER TABLE public.insurer_dossier_sends
  DROP CONSTRAINT IF EXISTS insurer_dossier_sends_send_type_check;

ALTER TABLE public.insurer_dossier_sends
  ADD CONSTRAINT insurer_dossier_sends_send_type_check CHECK (send_type IN (
    'initial', 'followup'
  ));

ALTER TABLE public.insurer_dossier_sends
  DROP CONSTRAINT IF EXISTS insurer_dossier_sends_documents_array_check;

ALTER TABLE public.insurer_dossier_sends
  ADD CONSTRAINT insurer_dossier_sends_documents_array_check CHECK (
    jsonb_typeof(documents) = 'array'
  );

CREATE INDEX IF NOT EXISTS idx_insurer_dossier_sends_lead_created
  ON public.insurer_dossier_sends(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insurer_dossier_sends_company_created
  ON public.insurer_dossier_sends(insurance_company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insurer_dossier_sends_pending
  ON public.insurer_dossier_sends(status, scheduled_at, created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_insurer_dossier_sends_followup
  ON public.insurer_dossier_sends(status, next_followup_at, followup_step)
  WHERE status = 'sent' AND next_followup_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_insurer_dossier_sends_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_insurer_dossier_sends_updated_at ON public.insurer_dossier_sends;
CREATE TRIGGER trg_insurer_dossier_sends_updated_at
  BEFORE UPDATE ON public.insurer_dossier_sends
  FOR EACH ROW EXECUTE FUNCTION public.update_insurer_dossier_sends_updated_at();

ALTER TABLE public.insurer_dossier_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Backoffice users manage insurer dossier sends" ON public.insurer_dossier_sends;
CREATE POLICY "Backoffice users manage insurer dossier sends"
  ON public.insurer_dossier_sends
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role manages insurer dossier sends" ON public.insurer_dossier_sends;
CREATE POLICY "Service role manages insurer dossier sends"
  ON public.insurer_dossier_sends
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF to_regclass('public.crm_interactions') IS NOT NULL THEN
    ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS type text;
    ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS interaction_type text;
    ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS direction text;
    ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS channel text DEFAULT 'email';
    ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS subject text;
    ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS content text;
    ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS body text;
    ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent';
    ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS created_by uuid;
    ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'crm_interactions' AND column_name = 'type'
    ) THEN
      ALTER TABLE public.crm_interactions ALTER COLUMN type SET DEFAULT 'system';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'crm_interactions' AND column_name = 'interaction_type'
    ) THEN
      ALTER TABLE public.crm_interactions ALTER COLUMN interaction_type SET DEFAULT 'system';
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.log_insurer_dossier_interaction(
  p_lead_id uuid,
  p_send_id uuid,
  p_subject text,
  p_content text,
  p_status text DEFAULT 'sent',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF to_regclass('public.crm_interactions') IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.crm_interactions (
    lead_id,
    type,
    interaction_type,
    direction,
    channel,
    subject,
    content,
    body,
    status,
    created_by,
    metadata
  )
  VALUES (
    p_lead_id,
    'email',
    'email',
    'outbound',
    'email',
    p_subject,
    p_content,
    p_content,
    COALESCE(NULLIF(p_status, ''), 'sent'),
    auth.uid(),
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'insurer_dossier_send_id', p_send_id,
      'workflow', 'insurer_dossier'
    )
  );
EXCEPTION WHEN others THEN
  RAISE WARNING 'Could not log insurer dossier interaction for send %: %', p_send_id, SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_insurer_dossier_send(
  p_lead_id uuid,
  p_company_id uuid DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL,
  p_recipient_email text DEFAULT NULL,
  p_recipient_name text DEFAULT NULL,
  p_company_name text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_documents jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := lower(trim(COALESCE(p_recipient_email, '')));
  v_subject text := trim(COALESCE(p_subject, ''));
  v_message text := NULLIF(trim(COALESCE(p_message, '')), '');
  v_documents jsonb := COALESCE(p_documents, '[]'::jsonb);
  v_doc_count integer;
  v_send_id uuid;
  v_lead record;
  v_contact record;
  v_company_name text := NULLIF(trim(COALESCE(p_company_name, '')), '');
  v_recipient_name text := NULLIF(trim(COALESCE(p_recipient_name, '')), '');
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()) THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  IF p_lead_id IS NULL THEN
    RAISE EXCEPTION 'Lead requis';
  END IF;

  SELECT id, first_name, last_name, email, phone, company_name, city, postal_code
  INTO v_lead
  FROM public.crm_leads
  WHERE id = p_lead_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead introuvable';
  END IF;

  IF p_contact_id IS NOT NULL THEN
    SELECT c.id, c.email, c.full_name, c.company_id, ic.name AS company_name
    INTO v_contact
    FROM public.insurance_company_contacts c
    LEFT JOIN public.insurance_companies ic ON ic.id = c.company_id
    WHERE c.id = p_contact_id
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Contact assureur introuvable';
    END IF;

    IF v_email = '' THEN
      v_email := lower(trim(COALESCE(v_contact.email, '')));
    END IF;

    IF v_recipient_name IS NULL THEN
      v_recipient_name := v_contact.full_name;
    END IF;

    IF p_company_id IS NULL THEN
      p_company_id := v_contact.company_id;
    END IF;

    v_company_name := COALESCE(v_company_name, NULLIF(trim(COALESCE(v_contact.company_name, '')), ''));
  END IF;

  IF v_email = '' OR v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Email destinataire invalide';
  END IF;

  IF v_subject = '' THEN
    v_subject := 'Demande de saisie devis - ' ||
      trim(COALESCE(v_lead.first_name, '') || ' ' || COALESCE(v_lead.last_name, ''));
  END IF;

  IF jsonb_typeof(v_documents) <> 'array' THEN
    RAISE EXCEPTION 'La liste des documents doit etre un tableau JSON';
  END IF;

  v_doc_count := jsonb_array_length(v_documents);
  IF v_doc_count = 0 THEN
    RAISE EXCEPTION 'Selectionnez au moins un document';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_documents) AS doc
    WHERE trim(COALESCE(doc->>'file_url', doc->>'url', '')) = ''
  ) THEN
    RAISE EXCEPTION 'Tous les documents doivent avoir une URL fichier';
  END IF;

  IF p_company_id IS NOT NULL AND v_company_name IS NULL THEN
    SELECT name INTO v_company_name
    FROM public.insurance_companies
    WHERE id = p_company_id
    LIMIT 1;
  END IF;

  INSERT INTO public.insurer_dossier_sends (
    lead_id,
    insurance_company_id,
    contact_id,
    recipient_email,
    recipient_name,
    company_name,
    subject,
    message,
    documents,
    status,
    send_type,
    attempts,
    max_attempts,
    scheduled_at,
    created_by,
    metadata
  )
  VALUES (
    p_lead_id,
    p_company_id,
    p_contact_id,
    v_email,
    v_recipient_name,
    COALESCE(v_company_name, 'Assureur'),
    v_subject,
    v_message,
    v_documents,
    'pending',
    'initial',
    0,
    3,
    now(),
    auth.uid(),
    jsonb_build_object(
      'queued_at', now(),
      'queued_by', auth.uid(),
      'documents_count', v_doc_count,
      'lead_email', v_lead.email,
      'lead_phone', v_lead.phone,
      'followup_policy', 'J+2 then J+5 when not marked responded',
      'compliance_note', 'explicit selected recipient and selected documents only; does not allow hidden contact import'
    )
  )
  RETURNING id INTO v_send_id;

  PERFORM public.log_insurer_dossier_interaction(
    p_lead_id,
    v_send_id,
    'Dossier assureur mis en file',
    format(
      'Dossier mis en file pour %s avec %s document(s). Relances automatiques J+2/J+5 si aucune reponse n est marquee.',
      v_email,
      v_doc_count
    ),
    'pending',
    jsonb_build_object(
      'recipient_email', v_email,
      'recipient_name', v_recipient_name,
      'company_name', COALESCE(v_company_name, 'Assureur'),
      'documents_count', v_doc_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'send_id', v_send_id,
    'lead_id', p_lead_id,
    'recipient_email', v_email,
    'documents_count', v_doc_count,
    'status', 'pending'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_insurer_dossier_responded(
  p_send_id uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_send record;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid()) THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  UPDATE public.insurer_dossier_sends
  SET
    status = 'responded',
    next_followup_at = NULL,
    processed_at = COALESCE(processed_at, now()),
    metadata = metadata || jsonb_build_object(
      'responded_at', now(),
      'responded_by', auth.uid(),
      'response_note', NULLIF(trim(COALESCE(p_note, '')), '')
    )
  WHERE id = p_send_id
  RETURNING * INTO v_send;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dossier assureur introuvable';
  END IF;

  PERFORM public.log_insurer_dossier_interaction(
    v_send.lead_id,
    v_send.id,
    'Reponse assureur marquee',
    COALESCE(NULLIF(trim(COALESCE(p_note, '')), ''), 'Reponse assureur marquee. Relances stoppees.'),
    'sent',
    jsonb_build_object(
      'recipient_email', v_send.recipient_email,
      'company_name', v_send.company_name
    )
  );

  RETURN jsonb_build_object('success', true, 'send_id', v_send.id, 'status', 'responded');
END;
$$;

DO $$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_command text;
BEGIN
  IF to_regnamespace('cron') IS NULL OR to_regnamespace('net') IS NULL THEN
    RAISE NOTICE 'pg_cron or pg_net unavailable: process-insurer-dossier-sends must be scheduled externally';
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
      RAISE NOTICE 'Missing supabase_url or service role key: process-insurer-dossier-sends cron not installed';
    ELSE
      BEGIN
        EXECUTE 'SELECT cron.unschedule(''process-insurer-dossier-sends'')';
      EXCEPTION WHEN others THEN
        NULL;
      END;

      v_command := format(
        'SELECT net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || %L), body := jsonb_build_object(''limit'', 20), timeout_milliseconds := 30000);',
        rtrim(v_supabase_url, '/') || '/functions/v1/process-insurer-dossier-sends',
        v_service_key
      );

      EXECUTE format(
        'SELECT cron.schedule(%L, %L, %L)',
        'process-insurer-dossier-sends',
        '*/10 * * * *',
        v_command
      );
    END IF;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.insurer_dossier_sends TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_insurer_dossier_send(uuid, uuid, uuid, text, text, text, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_insurer_dossier_responded(uuid, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
