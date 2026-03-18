/*
  # Client Portal Claims RPC Functions

  ## Summary
  The client portal uses a custom auth system (not Supabase Auth), so RLS policies
  based on auth.uid() don't apply. Access to crm_claims is blocked by RLS.
  
  This migration creates SECURITY DEFINER RPC functions to allow clients to:
  1. Read their own claims by email (via client_portal_users → lead_id)
  2. Insert a new claim linked to their lead_id

  ## New Functions
  - `get_client_claims_by_email(p_email)` - returns claims for authenticated portal user
  - `insert_client_claim(p_email, ...)` - inserts a new claim for the portal user

  ## Security
  - Both functions verify the portal user is active before proceeding
  - No direct table access is granted to anon role
*/

CREATE OR REPLACE FUNCTION public.get_client_claims_by_email(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
  v_is_active boolean;
  v_claims json;
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

  SELECT json_agg(
    json_build_object(
      'id',                   c.id,
      'claim_number',         c.claim_number,
      'incident_type',        c.incident_type,
      'claim_type',           c.claim_type,
      'incident_date',        c.incident_date,
      'incident_description', c.incident_description,
      'claim_status',         c.claim_status,
      'estimated_amount',     c.estimated_amount,
      'created_at',           c.created_at
    ) ORDER BY c.created_at DESC
  )
  INTO v_claims
  FROM crm_claims c
  WHERE c.lead_id = v_lead_id;

  RETURN json_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'claims', COALESCE(v_claims, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_claims_by_email(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.insert_client_claim(
  p_email              text,
  p_incident_type      text,
  p_claim_type         text,
  p_incident_date      date,
  p_incident_description text,
  p_third_party_involved boolean DEFAULT false,
  p_third_party_info   text DEFAULT NULL,
  p_police_report_number text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    'open',
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

GRANT EXECUTE ON FUNCTION public.insert_client_claim(text, text, text, date, text, boolean, text, text) TO anon, authenticated;
