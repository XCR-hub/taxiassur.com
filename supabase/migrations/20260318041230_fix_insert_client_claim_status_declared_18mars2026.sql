/*
  # Fix insert_client_claim: use valid claim_status value

  ## Problem
  The function inserts claim_status = 'open' but the check constraint
  requires one of: 'DECLARED', 'DOCUMENTS_PENDING', 'UNDER_REVIEW',
  'APPROVED', 'REJECTED', 'PAID', 'CLOSED'.

  ## Fix
  Replace 'open' with 'DECLARED' as the initial status for new claims.
  Uses the exact argument signature to avoid ambiguity.
*/

CREATE OR REPLACE FUNCTION insert_client_claim(
  p_email                text,
  p_incident_type        text,
  p_claim_type           text,
  p_incident_date        date,
  p_incident_description text,
  p_third_party_involved boolean DEFAULT false,
  p_third_party_info     text    DEFAULT NULL,
  p_police_report_number text    DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id    uuid;
  v_is_active  boolean;
  v_claim_id   uuid;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email invalide');
  END IF;

  SELECT lead_id, is_active INTO v_lead_id, v_is_active
  FROM client_portal_users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_lead_id IS NULL OR NOT COALESCE(v_is_active, false) THEN
    RETURN json_build_object('success', false, 'error', 'Compte non trouvé ou inactif');
  END IF;

  INSERT INTO crm_claims (
    lead_id,
    incident_type,
    claim_type,
    incident_date,
    incident_description,
    third_party_involved,
    third_party_info,
    police_report_number,
    claim_status,
    reported_by,
    declared_at,
    created_at,
    updated_at
  ) VALUES (
    v_lead_id,
    p_incident_type,
    COALESCE(p_claim_type, p_incident_type),
    p_incident_date,
    p_incident_description,
    COALESCE(p_third_party_involved, false),
    p_third_party_info,
    p_police_report_number,
    'DECLARED',
    'client_portal',
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_claim_id;

  RETURN json_build_object(
    'success', true,
    'claim_id', v_claim_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION insert_client_claim(text, text, text, date, text, boolean, text, text) TO anon, authenticated;
