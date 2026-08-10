-- Public client access must use a high-entropy access token, never a lead UUID.
CREATE OR REPLACE FUNCTION public.get_or_create_client_portal_access(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_lead public.crm_leads%ROWTYPE;
  v_portal_user public.client_portal_users%ROWTYPE;
  v_token text := btrim(p_token);
BEGIN
  IF v_token !~ '^[0-9A-Fa-f]{64}$' THEN
    RETURN json_build_object('success', false, 'error', 'Token invalide');
  END IF;

  SELECT * INTO v_lead
  FROM public.crm_leads
  WHERE access_token = v_token
  LIMIT 1;

  IF v_lead IS NULL OR v_lead.email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Acces non valide');
  END IF;

  SELECT * INTO v_portal_user
  FROM public.client_portal_users
  WHERE lead_id = v_lead.id OR lower(email) = lower(v_lead.email)
  ORDER BY (lead_id = v_lead.id) DESC
  LIMIT 1;

  IF v_portal_user IS NULL THEN
    INSERT INTO public.client_portal_users (
      email, lead_id, first_name, last_name, phone, is_active, metadata
    ) VALUES (
      lower(btrim(v_lead.email)), v_lead.id, v_lead.first_name, v_lead.last_name,
      v_lead.phone, true,
      jsonb_build_object('created_from', 'client_access_token', 'created_at', now())
    )
    RETURNING * INTO v_portal_user;
  ELSIF NOT v_portal_user.is_active THEN
    RETURN json_build_object('success', false, 'error', 'Acces desactive');
  END IF;

  RETURN json_build_object(
    'success', true,
    'portal_user_id', v_portal_user.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_client_portal_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_client_portal_access(text) TO anon, authenticated, service_role;