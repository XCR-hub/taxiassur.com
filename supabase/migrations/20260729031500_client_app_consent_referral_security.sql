/*
  Client app onboarding, consent ledger, referral base and document scan queue.

  This migration intentionally implements explicit, revocable consent. It does
  not authorize covert scraping of contacts, emails or cross-site navigation.
*/

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.client_portal_users') IS NOT NULL THEN
    ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS lead_id uuid;
    ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
    ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS app_onboarding_status text NOT NULL DEFAULT 'pending';
    ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS app_onboarding_completed_at timestamptz;
    ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS marketing_consent_email boolean NOT NULL DEFAULT false;
    ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS marketing_consent_sms boolean NOT NULL DEFAULT false;
    ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS marketing_consent_phone boolean NOT NULL DEFAULT false;
    ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS partner_cross_sell_consent boolean NOT NULL DEFAULT false;
    ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS behavioral_personalization_consent boolean NOT NULL DEFAULT false;
    ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS consent_source text;
    ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS consent_updated_at timestamptz;
    ALTER TABLE public.client_portal_users ADD COLUMN IF NOT EXISTS consent_revoked_at timestamptz;

    CREATE INDEX IF NOT EXISTS idx_client_portal_users_lead_id_app ON public.client_portal_users(lead_id);
    CREATE INDEX IF NOT EXISTS idx_client_portal_users_consents ON public.client_portal_users(
      marketing_consent_email,
      marketing_consent_sms,
      partner_cross_sell_consent,
      behavioral_personalization_consent
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.client_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id uuid,
  lead_id uuid,
  email text NOT NULL,
  consent_key text NOT NULL,
  consent_value boolean NOT NULL,
  lawful_basis text NOT NULL DEFAULT 'consent',
  source text NOT NULL DEFAULT 'client_portal',
  proof jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_consent_events_key_check CHECK (
    consent_key IN (
      'marketing_email',
      'marketing_sms',
      'marketing_phone',
      'partner_cross_sell',
      'behavioral_personalization'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_client_consent_events_email_created
  ON public.client_consent_events(lower(email), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_consent_events_lead_created
  ON public.client_consent_events(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_consent_events_portal_created
  ON public.client_consent_events(portal_user_id, created_at DESC);

ALTER TABLE public.client_consent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages client consent events" ON public.client_consent_events;
CREATE POLICY "Service role manages client consent events"
  ON public.client_consent_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id text NOT NULL,
  referred_email text NOT NULL,
  referred_id text,
  status text NOT NULL DEFAULT 'pending',
  reward_amount numeric NOT NULL DEFAULT 25,
  reward_type text NOT NULL DEFAULT 'discount',
  consent_proof jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT referrals_status_check CHECK (status IN ('pending', 'completed', 'cancelled')),
  CONSTRAINT referrals_reward_type_check CHECK (reward_type IN ('credit', 'discount', 'cash', 'gift'))
);

DO $$
BEGIN
  IF to_regclass('public.referral_codes') IS NOT NULL THEN
    ALTER TABLE public.referral_codes ADD COLUMN IF NOT EXISTS user_id text;
    ALTER TABLE public.referral_codes ADD COLUMN IF NOT EXISTS code text;
    ALTER TABLE public.referral_codes ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
    ALTER TABLE public.referral_codes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF to_regclass('public.referrals') IS NOT NULL THEN
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referrer_id text;
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referred_email text;
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referred_id text;
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS reward_amount numeric NOT NULL DEFAULT 25;
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS reward_type text NOT NULL DEFAULT 'discount';
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS consent_proof jsonb NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
    ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS completed_at timestamptz;
  END IF;

  IF to_regclass('public.user_rewards') IS NOT NULL THEN
    ALTER TABLE public.user_rewards ADD COLUMN IF NOT EXISTS user_id text;
    ALTER TABLE public.user_rewards ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'gift';
    ALTER TABLE public.user_rewards ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 25;
    ALTER TABLE public.user_rewards ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'referral';
    ALTER TABLE public.user_rewards ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
    ALTER TABLE public.user_rewards ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE public.user_rewards ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id
  ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code
  ON public.referral_codes(code);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_email
  ON public.referrals(lower(referred_email));
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_created
  ON public.referrals(referrer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL DEFAULT 'gift',
  amount numeric NOT NULL DEFAULT 25,
  source text NOT NULL DEFAULT 'referral',
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text
);

CREATE TABLE IF NOT EXISTS public.document_security_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  document_id uuid,
  lead_id uuid,
  storage_bucket text,
  file_path text,
  file_name text,
  content_type text,
  status text NOT NULL DEFAULT 'pending',
  engine text NOT NULL DEFAULT 'clamav',
  scan_started_at timestamptz,
  scan_finished_at timestamptz,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_security_scans_status_check CHECK (
    status IN ('pending', 'clean', 'infected', 'blocked', 'error')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_security_scans_document
  ON public.document_security_scans(source_table, document_id)
  WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_security_scans_status_created
  ON public.document_security_scans(status, created_at);
CREATE INDEX IF NOT EXISTS idx_document_security_scans_lead
  ON public.document_security_scans(lead_id);

ALTER TABLE public.document_security_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages document security scans" ON public.document_security_scans;
CREATE POLICY "Service role manages document security scans"
  ON public.document_security_scans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF to_regclass('public.prospect_documents') IS NOT NULL THEN
    ALTER TABLE public.prospect_documents ADD COLUMN IF NOT EXISTS security_scan_status text NOT NULL DEFAULT 'pending';
    ALTER TABLE public.prospect_documents ADD COLUMN IF NOT EXISTS security_scan_checked_at timestamptz;
    ALTER TABLE public.prospect_documents ADD COLUMN IF NOT EXISTS security_scan_engine text;
    ALTER TABLE public.prospect_documents ADD COLUMN IF NOT EXISTS security_scan_result jsonb NOT NULL DEFAULT '{}'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_prospect_documents_security_scan_status
      ON public.prospect_documents(security_scan_status);
  END IF;

  IF to_regclass('public.crm_lead_documents') IS NOT NULL THEN
    ALTER TABLE public.crm_lead_documents ADD COLUMN IF NOT EXISTS security_scan_status text NOT NULL DEFAULT 'pending';
    ALTER TABLE public.crm_lead_documents ADD COLUMN IF NOT EXISTS security_scan_checked_at timestamptz;
    ALTER TABLE public.crm_lead_documents ADD COLUMN IF NOT EXISTS security_scan_engine text;
    ALTER TABLE public.crm_lead_documents ADD COLUMN IF NOT EXISTS security_scan_result jsonb NOT NULL DEFAULT '{}'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_security_scan_status
      ON public.crm_lead_documents(security_scan_status);
  END IF;

  IF to_regclass('public.client_document_requests') IS NOT NULL THEN
    ALTER TABLE public.client_document_requests ADD COLUMN IF NOT EXISTS security_scan_status text NOT NULL DEFAULT 'pending';
    ALTER TABLE public.client_document_requests ADD COLUMN IF NOT EXISTS security_scan_checked_at timestamptz;
    ALTER TABLE public.client_document_requests ADD COLUMN IF NOT EXISTS security_scan_engine text;
    ALTER TABLE public.client_document_requests ADD COLUMN IF NOT EXISTS security_scan_result jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enqueue_document_security_scan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc jsonb := to_jsonb(NEW);
  v_doc_id uuid;
  v_lead_id uuid;
BEGIN
  v_doc_id := NULLIF(v_doc ->> 'id', '')::uuid;
  v_lead_id := NULLIF(v_doc ->> 'lead_id', '')::uuid;

  INSERT INTO public.document_security_scans (
    source_table,
    document_id,
    lead_id,
    storage_bucket,
    file_path,
    file_name,
    content_type,
    status,
    result
  )
  VALUES (
    TG_TABLE_NAME,
    v_doc_id,
    v_lead_id,
    COALESCE(v_doc ->> 'bucket', v_doc ->> 'storage_bucket'),
    COALESCE(v_doc ->> 'file_path', v_doc ->> 'storage_path', v_doc ->> 'file_url'),
    COALESCE(v_doc ->> 'file_name', v_doc ->> 'name'),
    COALESCE(v_doc ->> 'mime_type', v_doc ->> 'content_type', v_doc ->> 'file_type'),
    'pending',
    jsonb_build_object('queued_by', 'db_trigger', 'queued_at', now())
  )
  ON CONFLICT (source_table, document_id)
  WHERE document_id IS NOT NULL
  DO UPDATE SET
    status = 'pending',
    file_path = EXCLUDED.file_path,
    file_name = EXCLUDED.file_name,
    content_type = EXCLUDED.content_type,
    result = EXCLUDED.result,
    updated_at = now();

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.prospect_documents') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_enqueue_prospect_document_security_scan ON public.prospect_documents;
    CREATE TRIGGER trg_enqueue_prospect_document_security_scan
      AFTER INSERT ON public.prospect_documents
      FOR EACH ROW EXECUTE FUNCTION public.enqueue_document_security_scan();
  END IF;

  IF to_regclass('public.crm_lead_documents') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_enqueue_crm_document_security_scan ON public.crm_lead_documents;
    CREATE TRIGGER trg_enqueue_crm_document_security_scan
      AFTER INSERT ON public.crm_lead_documents
      FOR EACH ROW EXECUTE FUNCTION public.enqueue_document_security_scan();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_client_app_access(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_portal_id uuid;
BEGIN
  SELECT id, email, first_name, last_name, phone
  INTO v_lead
  FROM public.crm_leads
  WHERE id = p_lead_id;

  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead introuvable';
  END IF;

  IF v_lead.email IS NULL OR length(trim(v_lead.email)) = 0 THEN
    RAISE EXCEPTION 'Le client n a pas d email';
  END IF;

  INSERT INTO public.client_portal_users (
    email,
    password_hash,
    first_name,
    last_name,
    phone,
    lead_id,
    is_active,
    metadata,
    app_onboarding_status,
    updated_at
  )
  VALUES (
    lower(trim(v_lead.email)),
    'client-link-managed',
    COALESCE(NULLIF(trim(v_lead.first_name), ''), 'Client'),
    COALESCE(NULLIF(trim(v_lead.last_name), ''), 'TaxiAssur'),
    v_lead.phone,
    v_lead.id,
    true,
    jsonb_build_object('app_access_created_at', now(), 'app_access_source', 'contract_finalization'),
    'pending',
    now()
  )
  ON CONFLICT (email)
  DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = COALESCE(EXCLUDED.phone, public.client_portal_users.phone),
    lead_id = COALESCE(EXCLUDED.lead_id, public.client_portal_users.lead_id),
    is_active = true,
    metadata = COALESCE(public.client_portal_users.metadata, '{}'::jsonb) || EXCLUDED.metadata,
    app_onboarding_status = COALESCE(public.client_portal_users.app_onboarding_status, 'pending'),
    updated_at = now()
  RETURNING id INTO v_portal_id;

  RETURN jsonb_build_object(
    'success', true,
    'portal_user_id', v_portal_id,
    'email', lower(trim(v_lead.email))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_client_consent_event(
  p_email text,
  p_consent_key text,
  p_consent_value boolean,
  p_source text DEFAULT 'client_portal',
  p_proof jsonb DEFAULT '{}'::jsonb,
  p_lead_id uuid DEFAULT NULL,
  p_portal_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(COALESCE(p_email, '')));
  v_portal record;
  v_lead_id uuid := p_lead_id;
  v_portal_user_id uuid := p_portal_user_id;
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'Email requis';
  END IF;

  IF p_consent_key NOT IN (
    'marketing_email',
    'marketing_sms',
    'marketing_phone',
    'partner_cross_sell',
    'behavioral_personalization'
  ) THEN
    RAISE EXCEPTION 'Consentement inconnu: %', p_consent_key;
  END IF;

  SELECT id, lead_id
  INTO v_portal
  FROM public.client_portal_users
  WHERE lower(email) = v_email
  LIMIT 1;

  v_portal_user_id := COALESCE(v_portal_user_id, v_portal.id);
  v_lead_id := COALESCE(v_lead_id, v_portal.lead_id);

  INSERT INTO public.client_consent_events (
    portal_user_id,
    lead_id,
    email,
    consent_key,
    consent_value,
    source,
    proof
  )
  VALUES (
    v_portal_user_id,
    v_lead_id,
    v_email,
    p_consent_key,
    p_consent_value,
    COALESCE(NULLIF(p_source, ''), 'client_portal'),
    COALESCE(p_proof, '{}'::jsonb)
  );

  UPDATE public.client_portal_users
  SET
    marketing_consent_email = CASE WHEN p_consent_key = 'marketing_email' THEN p_consent_value ELSE marketing_consent_email END,
    marketing_consent_sms = CASE WHEN p_consent_key = 'marketing_sms' THEN p_consent_value ELSE marketing_consent_sms END,
    marketing_consent_phone = CASE WHEN p_consent_key = 'marketing_phone' THEN p_consent_value ELSE marketing_consent_phone END,
    partner_cross_sell_consent = CASE WHEN p_consent_key = 'partner_cross_sell' THEN p_consent_value ELSE partner_cross_sell_consent END,
    behavioral_personalization_consent = CASE WHEN p_consent_key = 'behavioral_personalization' THEN p_consent_value ELSE behavioral_personalization_consent END,
    consent_source = COALESCE(NULLIF(p_source, ''), 'client_portal'),
    consent_updated_at = now(),
    consent_revoked_at = CASE WHEN p_consent_value IS false THEN now() ELSE consent_revoked_at END,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_consent_key', p_consent_key,
      'last_consent_value', p_consent_value,
      'last_consent_at', now()
    ),
    updated_at = now()
  WHERE lower(email) = v_email;

  RETURN jsonb_build_object('success', true, 'email', v_email, 'consent_key', p_consent_key, 'consent_value', p_consent_value);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_client_marketing_consents(
  p_email text,
  p_source text DEFAULT 'client_portal',
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(COALESCE(p_email, '')));
  v_proof jsonb := jsonb_build_object('reason', COALESCE(p_reason, 'user_revocation'));
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'Email requis';
  END IF;

  PERFORM public.record_client_consent_event(v_email, 'marketing_email', false, p_source, v_proof);
  PERFORM public.record_client_consent_event(v_email, 'marketing_sms', false, p_source, v_proof);
  PERFORM public.record_client_consent_event(v_email, 'marketing_phone', false, p_source, v_proof);
  PERFORM public.record_client_consent_event(v_email, 'partner_cross_sell', false, p_source, v_proof);
  PERFORM public.record_client_consent_event(v_email, 'behavioral_personalization', false, p_source, v_proof);

  RETURN jsonb_build_object('success', true, 'email', v_email, 'revoked_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_client_app_access(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_client_consent_event(text, text, boolean, text, jsonb, uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_client_marketing_consents(text, text, text) TO anon, authenticated, service_role;

COMMIT;
