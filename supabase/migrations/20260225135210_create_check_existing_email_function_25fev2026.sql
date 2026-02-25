/*
  # Fonction de verification email existant - 25 Fevrier 2026
  
  Permet de detecter si un email existe deja et proposer un choix au prospect
*/

CREATE OR REPLACE FUNCTION check_existing_email(p_email text)
RETURNS TABLE(
  email_exists boolean,
  lead_id uuid,
  first_name text,
  last_name text,
  phone text,
  city text,
  vehicle_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as email_exists,
    crm_leads.id as lead_id,
    crm_leads.first_name,
    crm_leads.last_name,
    crm_leads.phone,
    crm_leads.city,
    COUNT(*)::int as vehicle_count,
    MIN(crm_leads.created_at) as created_at
  FROM crm_leads
  WHERE crm_leads.email = p_email
  GROUP BY crm_leads.id, crm_leads.first_name, crm_leads.last_name, crm_leads.phone, crm_leads.city
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, 0, NULL::timestamptz;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION resend_lead_access(p_email text)
RETURNS TABLE(lead_id uuid, access_token text, success boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
  v_token text;
  v_full_name text;
  v_city text;
  v_phone text;
  v_client_queue_id uuid;
BEGIN
  SELECT 
    crm_leads.id, 
    crm_leads.access_token,
    crm_leads.first_name || ' ' || COALESCE(crm_leads.last_name, ''),
    crm_leads.city,
    crm_leads.phone
  INTO v_lead_id, v_token, v_full_name, v_city, v_phone
  FROM crm_leads
  WHERE crm_leads.email = p_email
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, false;
    RETURN;
  END IF;

  v_client_queue_id := queue_simple_email(
    p_lead_id := v_lead_id,
    p_email_type := 'resend_access',
    p_to_email := p_email,
    p_to_name := v_full_name,
    p_subject := 'Vos acces TaxiAssur - Dossier existant',
    p_html_content := format('
<h1>Bonjour %s,</h1>
<p>Vous avez deja un dossier chez TaxiAssur.</p>
<p><a href="https://taxiassur.com/espace-prospect/%s" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Acceder a mon espace</a></p>
<p>Vous souhaitez assurer un 2eme vehicule ? Remplissez a nouveau le formulaire.</p>
<p>L equipe TaxiAssur</p>
',
      v_full_name,
      v_token
    ),
    p_priority := 10
  );

  RETURN QUERY SELECT v_lead_id, v_token, true;
END;
$$;

GRANT EXECUTE ON FUNCTION check_existing_email TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION resend_lead_access TO anon, authenticated, service_role;
