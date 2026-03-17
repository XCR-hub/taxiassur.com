/*
  # Create RPC to get or create client portal user

  This function allows unauthenticated access (via anon key) to:
  1. Look up a lead by its access_token
  2. Create or retrieve the corresponding client_portal_users entry
  3. Return the lead's email for redirect

  It uses SECURITY DEFINER so it bypasses RLS and works without auth.
*/

CREATE OR REPLACE FUNCTION get_or_create_client_portal_access(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_portal record;
  v_result json;
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

  -- Fallback: try by ID (for admin usage)
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

  -- Check if portal user exists
  SELECT id INTO v_portal
  FROM client_portal_users
  WHERE email = lower(trim(v_lead.email))
  LIMIT 1;

  -- Create portal user if needed
  IF v_portal IS NULL THEN
    INSERT INTO client_portal_users (
      email,
      lead_id,
      first_name,
      last_name,
      phone,
      is_active,
      metadata
    ) VALUES (
      lower(trim(v_lead.email)),
      v_lead.id,
      v_lead.first_name,
      v_lead.last_name,
      v_lead.phone,
      true,
      json_build_object(
        'created_from', 'client_access_token',
        'created_at', now()::text,
        'initial_status', v_lead.status
      )
    )
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN json_build_object(
    'success', true,
    'email', v_lead.email,
    'first_name', v_lead.first_name,
    'last_name', v_lead.last_name,
    'lead_id', v_lead.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_client_portal_access(text) TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_client_portal_access(text) TO authenticated;
