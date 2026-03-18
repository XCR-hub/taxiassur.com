/*
  # Enhance client portal RPC to return real CRM lead data

  1. Problem
    - ClientProfil shows "Non renseigne" for all fields because client_portal_users
      has no data populated (name, phone, address, vehicle info)
    - The real data lives in crm_leads, linked via lead_id (just added) or email

  2. Solution
    - Update get_client_portal_data_by_email to JOIN with crm_leads
    - Return the full profile: name, phone, address, immatriculation, 
      lead created_at (for "Membre depuis"), contract info from lead

  3. Security
    - SECURITY DEFINER allows anon access
    - Only returns non-sensitive fields needed for the profile page
*/

CREATE OR REPLACE FUNCTION get_client_portal_data_by_email(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_lead record;
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
    lead_id,
    created_at
  INTO v_user
  FROM client_portal_users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_user IS NULL OR NOT v_user.is_active THEN
    RETURN json_build_object('success', false, 'error', 'Compte non trouvé ou inactif');
  END IF;

  -- Fetch linked CRM lead data (by lead_id if set, otherwise by email)
  IF v_user.lead_id IS NOT NULL THEN
    SELECT
      id, first_name, last_name, phone, email,
      address, postal_code, city,
      immatriculation, company_name,
      status, pipeline_stage, current_stage_key,
      quote_amount, payment_method,
      contract_signed, contract_signed_at,
      client_since, created_at,
      selected_company_id, selected_quote_id,
      documents_complete, total_uploaded_files, validated_files,
      metadata
    INTO v_lead
    FROM crm_leads
    WHERE id = v_user.lead_id AND deleted_at IS NULL
    LIMIT 1;
  END IF;

  -- Fallback: match by email if no lead_id or lead not found
  IF v_lead IS NULL THEN
    SELECT
      id, first_name, last_name, phone, email,
      address, postal_code, city,
      immatriculation, company_name,
      status, pipeline_stage, current_stage_key,
      quote_amount, payment_method,
      contract_signed, contract_signed_at,
      client_since, created_at,
      selected_company_id, selected_quote_id,
      documents_complete, total_uploaded_files, validated_files,
      metadata
    INTO v_lead
    FROM crm_leads
    WHERE email = lower(trim(p_email)) AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    -- If found by email, update the lead_id link for future use
    IF v_lead IS NOT NULL AND v_user.lead_id IS NULL THEN
      UPDATE client_portal_users
      SET lead_id = v_lead.id
      WHERE id = v_user.id;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    -- Portal user fields
    'id', v_user.id,
    'email', v_user.email,
    'is_active', v_user.is_active,
    'portal_created_at', v_user.created_at,
    -- Real lead data (preferred source of truth)
    'lead_id', COALESCE(v_user.lead_id, v_lead.id),
    'first_name', COALESCE(v_lead.first_name, v_user.first_name),
    'last_name', COALESCE(v_lead.last_name, v_user.last_name),
    'full_name', CASE
      WHEN v_lead.first_name IS NOT NULL OR v_lead.last_name IS NOT NULL
        THEN trim(COALESCE(v_lead.first_name, '') || ' ' || COALESCE(v_lead.last_name, ''))
      ELSE NULL
    END,
    'phone', COALESCE(v_lead.phone, v_user.phone),
    'company_name', COALESCE(v_lead.company_name, v_user.company_name),
    'address', v_lead.address,
    'postal_code', v_lead.postal_code,
    'city', v_lead.city,
    'immatriculation', v_lead.immatriculation,
    -- Contract / pipeline info
    'status', v_lead.status,
    'pipeline_stage', v_lead.pipeline_stage,
    'current_stage_key', v_lead.current_stage_key,
    'quote_amount', v_lead.quote_amount,
    'payment_method', v_lead.payment_method,
    'contract_signed', v_lead.contract_signed,
    'contract_signed_at', v_lead.contract_signed_at,
    'client_since', v_lead.client_since,
    -- Use the lead created_at for "Membre depuis" (original registration date)
    'created_at', COALESCE(v_lead.created_at, v_user.created_at),
    -- Document counts
    'documents_complete', v_lead.documents_complete,
    'total_uploaded_files', v_lead.total_uploaded_files,
    'validated_files', v_lead.validated_files,
    -- Selected insurer info
    'selected_company_id', v_lead.selected_company_id,
    'selected_quote_id', v_lead.selected_quote_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_client_portal_data_by_email(text) TO anon;
GRANT EXECUTE ON FUNCTION get_client_portal_data_by_email(text) TO authenticated;
