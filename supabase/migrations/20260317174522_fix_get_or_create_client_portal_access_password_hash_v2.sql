/*
  # Fix get_or_create_client_portal_access - use md5 for placeholder hash

  gen_random_bytes requires pgcrypto which isn't available.
  Use md5(random()::text || now()::text) as a placeholder password hash instead.
*/

CREATE OR REPLACE FUNCTION get_or_create_client_portal_access(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_portal_id uuid;
  v_fname text;
  v_lname text;
BEGIN
  IF p_token IS NULL OR p_token = '' THEN
    RETURN json_build_object('success', false, 'error', 'Token invalide');
  END IF;

  SELECT id, email, first_name, last_name, phone, status, access_token
  INTO v_lead
  FROM crm_leads
  WHERE access_token = p_token
  LIMIT 1;

  IF v_lead IS NULL THEN
    BEGIN
      SELECT id, email, first_name, last_name, phone, status, access_token
      INTO v_lead
      FROM crm_leads
      WHERE id = p_token::uuid
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF v_lead IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Accès non valide');
  END IF;

  IF v_lead.email IS NULL OR v_lead.email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email non enregistré');
  END IF;

  v_fname := COALESCE(NULLIF(trim(v_lead.first_name), ''), 'Client');
  v_lname := COALESCE(NULLIF(trim(v_lead.last_name), ''), 'TaxiAssur');

  SELECT id INTO v_portal_id
  FROM client_portal_users
  WHERE email = lower(trim(v_lead.email))
  LIMIT 1;

  IF v_portal_id IS NULL THEN
    INSERT INTO client_portal_users (
      email,
      first_name,
      last_name,
      phone,
      password_hash,
      is_active
    ) VALUES (
      lower(trim(v_lead.email)),
      v_fname,
      v_lname,
      v_lead.phone,
      md5(random()::text || now()::text || p_token),
      true
    )
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN json_build_object(
    'success', true,
    'email', v_lead.email,
    'first_name', v_fname,
    'last_name', v_lname,
    'lead_id', v_lead.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_client_portal_access(text) TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_client_portal_access(text) TO authenticated;
