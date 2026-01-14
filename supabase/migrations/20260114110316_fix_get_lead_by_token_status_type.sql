/*
  # Fix get_lead_by_token - Correction du type de colonne status
  
  Problème :
  - La colonne status est de type lead_status (ENUM)
  - La fonction retourne TEXT
  - Erreur de type mismatch
  
  Solution :
  - Changer le type de retour de status à lead_status
*/

-- Drop et recréer la fonction avec le bon type
DROP FUNCTION IF EXISTS get_lead_by_token(text);

CREATE OR REPLACE FUNCTION get_lead_by_token(p_token text)
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
  status lead_status,  -- Changé de text à lead_status
  document_checklist jsonb,
  documents_complete boolean,
  quote_amount numeric,
  quote_accepted_at timestamptz,
  contract_signed_at timestamptz,
  payment_completed_at timestamptz,
  contract_pdf_url text,
  attestation_pdf_url text,
  converted_to_client boolean,
  client_since timestamptz,
  current_stage_key text,
  selected_company_id uuid,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  IF p_token IS NULL OR p_token = '' THEN
    RAISE EXCEPTION 'Token invalide';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.first_name,
    l.last_name,
    l.email,
    l.phone,
    l.address,
    l.postal_code,
    l.city,
    l.company_name,
    l.siret,
    l.status,
    l.document_checklist,
    l.documents_complete,
    l.quote_amount,
    l.quote_accepted_at,
    l.contract_signed_at,
    l.payment_completed_at,
    l.contract_pdf_url,
    l.attestation_pdf_url,
    l.converted_to_client,
    l.client_since,
    l.current_stage_key,
    l.selected_company_id,
    l.created_at,
    l.updated_at
  FROM crm_leads l
  WHERE l.access_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_lead_by_token(text) TO anon;
