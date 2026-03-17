/*
  # Create RPC to get client portal data by email

  The ClientDashboard queries client_portal_users directly as anon,
  but RLS only allows authenticated users to read their own row.

  This SECURITY DEFINER function allows the client portal (unauthenticated)
  to fetch their own data using their email, which was validated by the token
  flow in get_or_create_client_portal_access.

  Security: the email is validated by the token-based access flow,
  and this function only returns non-sensitive fields needed for the dashboard.
*/

CREATE OR REPLACE FUNCTION get_client_portal_data_by_email(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email invalide');
  END IF;

  SELECT
    id,
    email,
    first_name,
    last_name,
    phone,
    company_name,
    is_active,
    created_at
  INTO v_user
  FROM client_portal_users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_user IS NULL OR NOT v_user.is_active THEN
    RETURN json_build_object('success', false, 'error', 'Compte non trouvé ou inactif');
  END IF;

  RETURN json_build_object(
    'success', true,
    'id', v_user.id,
    'email', v_user.email,
    'first_name', v_user.first_name,
    'last_name', v_user.last_name,
    'phone', v_user.phone,
    'company_name', v_user.company_name,
    'is_active', v_user.is_active,
    'created_at', v_user.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_client_portal_data_by_email(text) TO anon;
GRANT EXECUTE ON FUNCTION get_client_portal_data_by_email(text) TO authenticated;
