-- Replace email-as-authentication with the existing 256-bit lead access token.
CREATE OR REPLACE FUNCTION public.client_email_for_access_token(p_token text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(btrim(cpu.email))
  FROM public.crm_leads AS lead
  JOIN public.client_portal_users AS cpu
    ON cpu.lead_id = lead.id OR lower(cpu.email) = lower(lead.email)
  WHERE p_token ~ '^[0-9A-Fa-f]{64}$'
    AND lead.access_token = p_token
    AND cpu.is_active = true
    AND lead.deleted_at IS NULL
  ORDER BY (cpu.lead_id = lead.id) DESC
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.client_email_for_access_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_email_for_access_token(text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_client_portal_data_by_token(p_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  v_email := public.client_email_for_access_token(p_token);
  IF v_email IS NULL THEN RETURN json_build_object('success', false, 'error', 'Acces invalide'); END IF;
  RETURN public.get_client_portal_data_by_email(v_email);
END $$;

CREATE OR REPLACE FUNCTION public.get_client_claims_by_token(p_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  v_email := public.client_email_for_access_token(p_token);
  IF v_email IS NULL THEN RETURN json_build_object('success', false, 'error', 'Acces invalide'); END IF;
  RETURN public.get_client_claims_by_email(v_email);
END $$;

CREATE OR REPLACE FUNCTION public.get_client_documents_by_token(p_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  v_email := public.client_email_for_access_token(p_token);
  IF v_email IS NULL THEN RETURN json_build_object('success', false, 'error', 'Acces invalide'); END IF;
  RETURN public.get_client_documents_by_email(v_email);
END $$;

CREATE OR REPLACE FUNCTION public.get_client_insurance_company_by_token(p_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  v_email := public.client_email_for_access_token(p_token);
  IF v_email IS NULL THEN RETURN json_build_object('success', false, 'error', 'Acces invalide'); END IF;
  RETURN public.get_client_insurance_company_by_email(v_email);
END $$;

CREATE OR REPLACE FUNCTION public.insert_client_claim_by_token(
  p_token text,
  p_incident_type text,
  p_claim_type text,
  p_incident_date date,
  p_incident_description text,
  p_third_party_involved boolean DEFAULT false,
  p_third_party_info text DEFAULT NULL,
  p_police_report_number text DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  v_email := public.client_email_for_access_token(p_token);
  IF v_email IS NULL THEN RETURN json_build_object('success', false, 'error', 'Acces invalide'); END IF;
  IF p_incident_type IS NULL OR length(btrim(p_incident_type)) NOT BETWEEN 1 AND 80
     OR p_claim_type IS NULL OR length(btrim(p_claim_type)) NOT BETWEEN 1 AND 80
     OR p_incident_date IS NULL OR p_incident_date > current_date
     OR p_incident_date < current_date - interval '5 years'
     OR p_incident_description IS NULL OR length(btrim(p_incident_description)) NOT BETWEEN 10 AND 5000
     OR length(coalesce(p_third_party_info, '')) > 2000
     OR length(coalesce(p_police_report_number, '')) > 100 THEN
    RETURN json_build_object('success', false, 'error', 'Declaration invalide');
  END IF;
  RETURN public.insert_client_claim(
    v_email, btrim(p_incident_type), btrim(p_claim_type), p_incident_date,
    btrim(p_incident_description), coalesce(p_third_party_involved, false),
    nullif(btrim(p_third_party_info), ''), nullif(btrim(p_police_report_number), '')
  );
END $$;

REVOKE ALL ON FUNCTION public.get_client_portal_data_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_client_claims_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_client_documents_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_client_insurance_company_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.insert_client_claim(text, text, text, date, text, boolean, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_portal_data_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_client_claims_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_client_documents_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_client_insurance_company_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_client_claim(text, text, text, date, text, boolean, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.get_client_portal_data_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_client_claims_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_client_documents_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_client_insurance_company_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insert_client_claim_by_token(text, text, text, date, text, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_portal_data_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_claims_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_documents_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_insurance_company_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.insert_client_claim_by_token(text, text, text, date, text, boolean, text, text) TO anon, authenticated, service_role;
-- Client requests and consent preferences must also resolve identity from the access token.
CREATE OR REPLACE FUNCTION public.get_client_portal_requests_by_token(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  v_email := public.client_email_for_access_token(p_token);
  IF v_email IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Acces invalide'); END IF;
  RETURN public.get_client_portal_requests(v_email) - 'email';
END $$;

CREATE OR REPLACE FUNCTION public.create_client_portal_request_by_token(
  p_token text, p_request_type text, p_title text, p_description text DEFAULT NULL,
  p_new_data jsonb DEFAULT '{}'::jsonb, p_consent_snapshot jsonb DEFAULT '{}'::jsonb,
  p_priority text DEFAULT 'normal'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_result jsonb;
BEGIN
  v_email := public.client_email_for_access_token(p_token);
  IF v_email IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Acces invalide'); END IF;
  v_result := public.create_client_portal_request(v_email, p_request_type, p_title, p_description, p_new_data, p_consent_snapshot, p_priority);
  RETURN v_result - 'email';
END $$;

CREATE OR REPLACE FUNCTION public.get_client_consents_by_token(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_result jsonb;
BEGIN
  v_email := public.client_email_for_access_token(p_token);
  IF v_email IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Acces invalide'); END IF;
  SELECT jsonb_build_object(
    'success', true,
    'marketing_email', coalesce(marketing_consent_email, false),
    'marketing_sms', coalesce(marketing_consent_sms, false),
    'marketing_phone', coalesce(marketing_consent_phone, false),
    'partner_cross_sell', coalesce(partner_cross_sell_consent, false),
    'behavioral_personalization', coalesce(behavioral_personalization_consent, false)
  ) INTO v_result
  FROM public.client_portal_users WHERE lower(email) = v_email AND is_active = true LIMIT 1;
  RETURN coalesce(v_result, jsonb_build_object('success', false, 'error', 'Acces invalide'));
END $$;

CREATE OR REPLACE FUNCTION public.record_client_consent_by_token(
  p_token text, p_consent_key text, p_consent_value boolean,
  p_source text DEFAULT 'client_portal_preferences', p_proof jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  v_email := public.client_email_for_access_token(p_token);
  IF v_email IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Acces invalide'); END IF;
  RETURN public.record_client_consent_event(v_email, p_consent_key, p_consent_value, p_source, p_proof, NULL, NULL);
END $$;

CREATE OR REPLACE FUNCTION public.revoke_client_consents_by_token(
  p_token text, p_source text DEFAULT 'client_portal_revocation', p_reason text DEFAULT 'client_request'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  v_email := public.client_email_for_access_token(p_token);
  IF v_email IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Acces invalide'); END IF;
  RETURN public.revoke_client_marketing_consents(v_email, p_source, p_reason);
END $$;

REVOKE ALL ON FUNCTION public.get_client_portal_requests(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_client_portal_request(text, text, text, text, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_client_consent_event(text, text, boolean, text, jsonb, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_client_marketing_consents(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_portal_requests(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_client_portal_request(text, text, text, text, jsonb, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_client_consent_event(text, text, boolean, text, jsonb, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_client_marketing_consents(text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.get_client_portal_requests_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_client_portal_request_by_token(text, text, text, text, jsonb, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_client_consents_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_client_consent_by_token(text, text, boolean, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_client_consents_by_token(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_portal_requests_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_client_portal_request_by_token(text, text, text, text, jsonb, jsonb, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_consents_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_client_consent_by_token(text, text, boolean, text, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_client_consents_by_token(text, text, text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.client_lead_id_for_access_token(p_token text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.crm_leads
  WHERE p_token ~ '^[0-9A-Fa-f]{64}$' AND access_token = p_token AND deleted_at IS NULL
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.client_lead_id_for_access_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_lead_id_for_access_token(text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_client_notifications_by_token(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead_id uuid; v_rows jsonb;
BEGIN
  v_lead_id := public.client_lead_id_for_access_token(p_token);
  IF v_lead_id IS NULL OR public.client_email_for_access_token(p_token) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acces invalide');
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (SELECT id, title, message, type, created_at, dismissed, read_at
        FROM public.crm_event_notifications WHERE lead_id = v_lead_id
        ORDER BY created_at DESC LIMIT 50) n;
  RETURN jsonb_build_object('success', true, 'notifications', v_rows);
END $$;

CREATE OR REPLACE FUNCTION public.mark_client_notifications_read_by_token(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead_id uuid; v_count integer;
BEGIN
  v_lead_id := public.client_lead_id_for_access_token(p_token);
  IF v_lead_id IS NULL OR public.client_email_for_access_token(p_token) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acces invalide');
  END IF;
  UPDATE public.crm_event_notifications SET read_at = now(), is_read = true
  WHERE lead_id = v_lead_id AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'updated', v_count);
END $$;

CREATE OR REPLACE FUNCTION public.get_client_payments_by_token(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead_id uuid; v_email text; v_rows jsonb; v_lead jsonb;
BEGIN
  v_lead_id := public.client_lead_id_for_access_token(p_token);
  v_email := public.client_email_for_access_token(p_token);
  IF v_lead_id IS NULL OR v_email IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Acces invalide'); END IF;
  SELECT jsonb_build_object('id', id, 'email', email, 'first_name', first_name, 'last_name', last_name)
  INTO v_lead FROM public.crm_leads WHERE id = v_lead_id;
  SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (SELECT id, reference, amount, status, payment_date, card_type, card_last4,
               description, payment_url, created_at
        FROM public.monetico_payments WHERE lead_id = v_lead_id ORDER BY created_at DESC) p;
  RETURN jsonb_build_object('success', true, 'lead', v_lead, 'payments', v_rows);
END $$;

REVOKE ALL ON FUNCTION public.get_client_notifications_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_client_notifications_read_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_client_payments_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_notifications_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_client_notifications_read_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_client_payments_by_token(text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_client_referrals_by_token(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead_id uuid; v_code text; v_rows jsonb;
BEGIN
  v_lead_id := public.client_lead_id_for_access_token(p_token);
  IF v_lead_id IS NULL OR public.client_email_for_access_token(p_token) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acces invalide');
  END IF;
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = v_lead_id::text LIMIT 1;
  IF v_code IS NULL THEN
    v_code := upper(encode(gen_random_bytes(6), 'hex'));
    INSERT INTO public.referral_codes(user_id, code, created_at)
    VALUES (v_lead_id::text, v_code, now()) ON CONFLICT (user_id) DO UPDATE SET code = referral_codes.code
    RETURNING code INTO v_code;
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (SELECT id, referred_email, status, reward_amount, reward_type, created_at, completed_at
        FROM public.referrals WHERE referrer_id = v_lead_id::text ORDER BY created_at DESC LIMIT 100) r;
  RETURN jsonb_build_object('success', true, 'referral_code', v_code, 'referrals', v_rows);
END $$;

CREATE OR REPLACE FUNCTION public.create_client_referral_by_token(
  p_token text, p_referred_email text, p_permission_confirmed boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead_id uuid; v_client_email text; v_email text; v_id uuid;
BEGIN
  v_lead_id := public.client_lead_id_for_access_token(p_token);
  v_client_email := public.client_email_for_access_token(p_token);
  v_email := lower(btrim(coalesce(p_referred_email, '')));
  IF v_lead_id IS NULL OR v_client_email IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Acces invalide'); END IF;
  IF p_permission_confirmed IS NOT TRUE THEN RETURN jsonb_build_object('success', false, 'error', 'Consentement requis'); END IF;
  IF length(v_email) > 254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR v_email = v_client_email THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adresse invalide');
  END IF;
  INSERT INTO public.referrals(referrer_id, referred_email, status, reward_amount, reward_type, consent_proof)
  VALUES (v_lead_id::text, v_email, 'pending', 25, 'gift', jsonb_build_object(
    'confirmed_by_referrer', true, 'source', 'client_portal_referral',
    'wording_version', 'referral_2026_08_token', 'created_at', now()
  )) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'referral_id', v_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'Invitation deja existante');
END $$;

REVOKE ALL ON FUNCTION public.get_client_referrals_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_client_referral_by_token(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_referrals_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_client_referral_by_token(text, text, boolean) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.mark_client_notification_read_by_token(p_token text, p_notification_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead_id uuid; v_count integer;
BEGIN
  v_lead_id := public.client_lead_id_for_access_token(p_token);
  IF v_lead_id IS NULL OR public.client_email_for_access_token(p_token) IS NULL OR p_notification_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acces invalide');
  END IF;
  UPDATE public.crm_event_notifications SET read_at = coalesce(read_at, now()), is_read = true
  WHERE id = p_notification_id AND lead_id = v_lead_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', v_count = 1, 'updated', v_count);
END $$;
REVOKE ALL ON FUNCTION public.mark_client_notification_read_by_token(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_client_notification_read_by_token(text, uuid) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_client_quotes_by_token(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead_id uuid; v_rows jsonb;
BEGIN
  v_lead_id := public.client_lead_id_for_access_token(p_token);
  IF v_lead_id IS NULL OR public.client_email_for_access_token(p_token) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acces invalide');
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC), '[]'::jsonb)
  INTO v_rows FROM public.get_lead_quotes_by_token(p_token) q;
  RETURN jsonb_build_object('success', true, 'quotes', v_rows);
END $$;
REVOKE ALL ON FUNCTION public.get_client_quotes_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_quotes_by_token(text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_client_down_payment_by_token(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead_id uuid; v_result jsonb;
BEGIN
  v_lead_id := public.client_lead_id_for_access_token(p_token);
  IF v_lead_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Acces invalide'); END IF;
  SELECT jsonb_build_object(
    'success', true,
    'required', coalesce(down_payment_required, false),
    'amount', down_payment_amount,
    'status', down_payment_status,
    'payment_link', down_payment_link,
    'paid_at', down_payment_paid_at
  ) INTO v_result FROM public.lead_contracts WHERE lead_id = v_lead_id LIMIT 1;
  RETURN coalesce(v_result, jsonb_build_object('success', true, 'required', false));
END $$;
REVOKE ALL ON FUNCTION public.get_client_down_payment_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_down_payment_by_token(text) TO anon, authenticated, service_role;