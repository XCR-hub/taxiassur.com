/*
  # Fix get_or_create_client_portal_access RPC

  The client_portal_users table has NOT NULL constraints on:
  - password_hash
  - first_name
  - last_name

  The previous function didn't provide a password_hash, causing INSERT to fail.
  This fix:
  1. Provides a placeholder password_hash (random, unusable for login)
  2. Handles NULL first_name/last_name from leads with defaults
  3. Also handles the case where lead_id column doesn't exist in client_portal_users
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

  -- Look up lead by access_token
  SELECT id, email, first_name, last_name, phone, status, access_token
  INTO v_lead
  FROM crm_leads
  WHERE access_token = p_token
  LIMIT 1;

  -- Fallback: try by UUID (for admin usage)
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

  -- Handle NULL first/last name with safe defaults
  v_fname := COALESCE(NULLIF(trim(v_lead.first_name), ''), 'Client');
  v_lname := COALESCE(NULLIF(trim(v_lead.last_name), ''), 'TaxiAssur');

  -- Check if portal user exists
  SELECT id INTO v_portal_id
  FROM client_portal_users
  WHERE email = lower(trim(v_lead.email))
  LIMIT 1;

  -- Create portal user if needed
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
      -- Placeholder hash: not usable for login, portal uses token-based access
      encode(sha256(gen_random_bytes(32)), 'hex'),
      true
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO v_portal_id;
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
