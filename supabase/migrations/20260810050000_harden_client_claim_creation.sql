-- Token-bound claim creation with strict validation and incident location persistence.
CREATE OR REPLACE FUNCTION public.insert_client_claim_by_token_v2(
  p_token text,
  p_incident_type text,
  p_incident_date date,
  p_incident_description text,
  p_incident_location text DEFAULT NULL,
  p_third_party_involved boolean DEFAULT false,
  p_third_party_info text DEFAULT NULL,
  p_police_report_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_lead_id uuid;
  v_claim_id uuid;
  v_incident_type text := upper(btrim(coalesce(p_incident_type, '')));
BEGIN
  v_email := public.client_email_for_access_token(p_token);
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acces invalide');
  END IF;

  SELECT cpu.lead_id
  INTO v_lead_id
  FROM public.client_portal_users cpu
  WHERE lower(cpu.email) = lower(v_email)
    AND cpu.is_active = true
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Compte client inactif');
  END IF;

  IF v_incident_type <> ALL (ARRAY[
      'ACCIDENT_RESPONSABLE', 'ACCIDENT_NON_RESPONSABLE', 'BRIS_GLACE',
      'VOL', 'INCENDIE', 'CATASTROPHE_NATURELLE', 'VANDALISME',
      'DOMMAGES_COLLISION', 'ASSISTANCE', 'AUTRE'
    ])
    OR p_incident_date IS NULL
    OR p_incident_date > current_date
    OR p_incident_date < current_date - interval '5 years'
    OR length(btrim(coalesce(p_incident_description, ''))) NOT BETWEEN 10 AND 5000
    OR length(btrim(coalesce(p_incident_location, ''))) > 500
    OR length(btrim(coalesce(p_third_party_info, ''))) > 2000
    OR length(btrim(coalesce(p_police_report_number, ''))) > 100
  THEN
    RETURN jsonb_build_object('success', false, 'error', 'Declaration invalide');
  END IF;

  INSERT INTO public.crm_claims (
    lead_id, incident_type, claim_type, incident_date, incident_location,
    incident_description, third_party_involved, third_party_info,
    police_report_number, claim_status, reported_by, declared_at,
    created_at, updated_at
  ) VALUES (
    v_lead_id, v_incident_type, v_incident_type, p_incident_date,
    nullif(btrim(p_incident_location), ''), btrim(p_incident_description),
    coalesce(p_third_party_involved, false),
    nullif(btrim(p_third_party_info), ''),
    nullif(btrim(p_police_report_number), ''),
    'open', 'client_portal', now(), now(), now()
  ) RETURNING id INTO v_claim_id;

  RETURN jsonb_build_object('success', true, 'claim_id', v_claim_id);
END;
$$;

REVOKE ALL ON FUNCTION public.insert_client_claim_by_token_v2(text, text, date, text, text, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_client_claim_by_token_v2(text, text, date, text, text, boolean, text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.insert_client_claim_by_token_v2(text, text, date, text, text, boolean, text, text)
IS 'Creates a client claim only for an active token-bound portal and persists a validated incident location.';
