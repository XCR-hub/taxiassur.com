/*
  # Fix get_lead_by_token - Colonnes Manquantes

  ## Problème
  La fonction get_lead_by_token essaie d'accéder à des colonnes qui n'existent pas:
  - cl.quote_amount (n'existe pas dans crm_leads)
  - cl.quote_accepted_at (n'existe pas dans crm_leads)
  - cl.selected_company_id (n'existe pas dans crm_leads)

  ## Solution
  Retourner NULL pour ces colonnes car elles ne sont pas dans crm_leads
*/

DROP FUNCTION IF EXISTS public.get_lead_by_token(text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_lead_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  company_name text,
  siret text,
  status text,
  pipeline_stage text,
  documents_complete boolean,
  progression_percentage integer,
  total_documents integer,
  uploaded_documents integer,
  quote_amount numeric,
  quote_accepted_at timestamptz,
  contract_signed_at timestamptz,
  payment_completed_at timestamptz,
  contract_pdf_url text,
  attestation_pdf_url text,
  converted_to_client boolean,
  client_since timestamptz,
  selected_company_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_docs integer := 8;
  v_uploaded_docs integer;
  v_progression integer;
  v_lead_id uuid;
BEGIN
  -- Trouver le lead
  SELECT cl.id INTO v_lead_id
  FROM crm_leads cl
  WHERE cl.access_token = p_token AND cl.deleted_at IS NULL
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  -- Calculer les documents uploadés
  SELECT COUNT(DISTINCT document_type) INTO v_uploaded_docs
  FROM crm_lead_documents cld
  WHERE cld.lead_id = v_lead_id
    AND cld.document_type IN (
      'licence_taxi', 'permis_conduire', 'carte_grise', 'releve_information',
      'carte_professionnelle', 'kbis_sirene', 'piece_identite', 'rib'
    )
    AND cld.status != 'refused'
    AND cld.deleted_at IS NULL;

  v_uploaded_docs := COALESCE(v_uploaded_docs, 0);
  v_progression := ROUND((v_uploaded_docs::numeric / v_total_docs::numeric) * 100);

  RETURN QUERY
  SELECT
    cl.id,
    cl.first_name,
    cl.last_name,
    cl.email,
    cl.phone,
    cl.address,
    cl.postal_code,
    cl.city,
    cl.company_name,
    cl.siret,
    cl.status,
    cl.pipeline_stage,
    (v_uploaded_docs >= v_total_docs) as documents_complete,
    v_progression as progression_percentage,
    v_total_docs as total_documents,
    v_uploaded_docs as uploaded_documents,
    NULL::numeric as quote_amount,
    NULL::timestamptz as quote_accepted_at,
    cl.contract_signed_at,
    cl.payment_completed_at,
    cl.contract_pdf_url,
    cl.attestation_pdf_url,
    cl.converted_to_client,
    cl.client_since,
    NULL::uuid as selected_company_id,
    cl.created_at,
    cl.updated_at
  FROM crm_leads cl
  WHERE cl.access_token = p_token
    AND cl.deleted_at IS NULL
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_lead_by_token(text) IS 
'Retourne les informations du lead via son access_token avec progression des documents (FIXED: removed non-existent columns)';