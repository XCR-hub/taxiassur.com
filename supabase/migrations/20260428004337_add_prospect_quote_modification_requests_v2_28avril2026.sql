/*
  # Prospect quote modification requests (v2 - drop old function first)
*/

CREATE TABLE IF NOT EXISTS quote_modification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES lead_company_quotes(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  current_options jsonb DEFAULT '{}'::jsonb,
  requested_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  prospect_message text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid
);

CREATE INDEX IF NOT EXISTS idx_quote_mod_req_quote ON quote_modification_requests(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_mod_req_lead ON quote_modification_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_quote_mod_req_status ON quote_modification_requests(status);

ALTER TABLE quote_modification_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quote_modification_requests'
      AND policyname = 'Authenticated can read quote mod requests'
  ) THEN
    CREATE POLICY "Authenticated can read quote mod requests"
      ON quote_modification_requests FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quote_modification_requests'
      AND policyname = 'Authenticated can update quote mod requests'
  ) THEN
    CREATE POLICY "Authenticated can update quote mod requests"
      ON quote_modification_requests FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.get_lead_quotes_by_token(text);

CREATE OR REPLACE FUNCTION public.get_lead_quotes_by_token(p_token text)
RETURNS TABLE(
  id uuid,
  lead_id uuid,
  company_id uuid,
  company_name text,
  company_logo_url text,
  company_code text,
  quote_file_url text,
  quote_amount numeric,
  monthly_price numeric,
  coverage_type text,
  includes_immobilisation boolean,
  includes_assistance_0km boolean,
  includes_rc_pro boolean,
  includes_depannage_remorquage boolean,
  coverage_details text,
  status text,
  submitted_at timestamptz,
  last_sent_at timestamptz,
  quote_accepted_at timestamptz,
  refusal_reason text,
  created_at timestamptz,
  updated_at timestamptz,
  quote_options jsonb,
  enrollment_fee numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  SELECT cl.id INTO v_lead_id
  FROM crm_leads cl
  WHERE cl.access_token = p_token
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    lcq.id,
    lcq.lead_id,
    lcq.insurance_company_id AS company_id,
    COALESCE(ic.name, '') AS company_name,
    COALESCE(ic.logo_url, '') AS company_logo_url,
    COALESCE(ic.code, '') AS company_code,
    COALESCE(lcq.quote_pdf_url, lcq.quote_file_url, '') AS quote_file_url,
    lcq.quote_amount,
    lcq.monthly_price,
    lcq.coverage_type,
    COALESCE(lcq.includes_immobilisation, false) AS includes_immobilisation,
    COALESCE(lcq.includes_assistance_0km, true) AS includes_assistance_0km,
    COALESCE(lcq.includes_rc_pro, true) AS includes_rc_pro,
    COALESCE(lcq.includes_depannage_remorquage, true) AS includes_depannage_remorquage,
    lcq.coverage_details,
    COALESCE(lcq.quote_status::text, lcq.status::text, 'pending') AS status,
    COALESCE(lcq.sent_at, lcq.submitted_at) AS submitted_at,
    lcq.last_sent_at,
    lcq.quote_accepted_at,
    lcq.refusal_reason,
    lcq.created_at,
    lcq.updated_at,
    COALESCE(lcq.quote_options, '{}'::jsonb) AS quote_options,
    COALESCE(lcq.enrollment_fee, 0) AS enrollment_fee
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.lead_id = v_lead_id
    AND (lcq.quote_pdf_url IS NOT NULL OR lcq.quote_file_url IS NOT NULL)
  ORDER BY lcq.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_quotes_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_quote_modification_by_token(
  p_token text,
  p_quote_id uuid,
  p_requested_options jsonb,
  p_message text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
  v_lead_name text;
  v_company_name text;
  v_current_options jsonb;
  v_request_id uuid;
BEGIN
  SELECT cl.id, COALESCE(cl.first_name || ' ' || cl.last_name, cl.email)
    INTO v_lead_id, v_lead_name
  FROM crm_leads cl
  WHERE cl.access_token = p_token
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM lead_company_quotes
    WHERE id = p_quote_id AND lead_id = v_lead_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'quote_not_found');
  END IF;

  SELECT COALESCE(lcq.quote_options, '{}'::jsonb), COALESCE(ic.name, '')
    INTO v_current_options, v_company_name
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.id = p_quote_id;

  INSERT INTO quote_modification_requests (
    quote_id, lead_id, current_options, requested_options, prospect_message, status
  ) VALUES (
    p_quote_id, v_lead_id, v_current_options, p_requested_options, COALESCE(p_message, ''), 'pending'
  ) RETURNING id INTO v_request_id;

  BEGIN
    INSERT INTO crm_event_notifications (
      lead_id, event_type, title, message, priority, action_url, metadata, created_at
    ) VALUES (
      v_lead_id,
      'quote_modification_requested',
      'Demande de modification de devis - ' || v_company_name,
      'Le prospect ' || COALESCE(v_lead_name, '') || ' demande des changements sur le devis ' || v_company_name || '.' ||
        CASE WHEN COALESCE(p_message, '') <> '' THEN E'\nMessage : ' || p_message ELSE '' END,
      2,
      '/admin/crm/leads/' || v_lead_id::text,
      jsonb_build_object(
        'quote_id', p_quote_id,
        'request_id', v_request_id,
        'requested_options', p_requested_options,
        'current_options', v_current_options
      ),
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'company_name', v_company_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_quote_modification_by_token(text, uuid, jsonb, text) TO anon, authenticated;