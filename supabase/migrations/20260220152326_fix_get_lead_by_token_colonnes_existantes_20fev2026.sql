/*
  # Fix get_lead_by_token - Utiliser uniquement les colonnes existantes

  ## Problème
  La fonction utilise des colonnes qui n'existent pas :
  - contract_number (n'existe pas)
  - archived_at (c'est is_archived)

  ## Solution
  Utiliser uniquement les colonnes réelles de crm_leads et ajouter les compteurs de documents
*/

DROP FUNCTION IF EXISTS public.get_lead_by_token(text);

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
  lead_score integer,
  converted_to_client boolean,
  access_token text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  document_checklist jsonb,
  documents_complete boolean,
  quote_amount numeric,
  quote_accepted_at timestamptz,
  contract_signed_at timestamptz,
  payment_completed_at timestamptz,
  contract_pdf_url text,
  attestation_pdf_url text,
  client_since timestamptz,
  current_stage_key text,
  selected_company_id uuid,
  -- Nouveaux compteurs
  total_documents integer,
  uploaded_documents integer,
  progression_percentage integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_total_docs integer := 7;
  v_uploaded_docs integer := 0;
  v_progression integer := 0;
BEGIN
  -- Récupérer l'ID du lead
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND COALESCE(l.is_archived, false) = false
  LIMIT 1;

  -- Si le lead existe, calculer les compteurs
  IF v_lead_id IS NOT NULL THEN
    -- Compter les documents uploadés (uploaded_at IS NOT NULL)
    SELECT COUNT(*)
    INTO v_uploaded_docs
    FROM crm_lead_documents
    WHERE lead_id = v_lead_id
      AND uploaded_at IS NOT NULL;

    -- Calculer le pourcentage
    IF v_total_docs > 0 THEN
      v_progression := ROUND((v_uploaded_docs::numeric / v_total_docs::numeric) * 100)::integer;
    END IF;
  END IF;

  -- Retourner les données du lead avec les compteurs
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
    l.status::text,
    l.pipeline_stage,
    l.lead_score,
    l.converted_to_client,
    l.access_token,
    l.metadata,
    l.created_at,
    l.updated_at,
    COALESCE(l.document_checklist, '{}'::jsonb) as document_checklist,
    COALESCE(l.documents_complete, false) as documents_complete,
    l.quote_amount,
    l.quote_accepted_at,
    l.contract_signed_at,
    l.payment_completed_at,
    l.contract_pdf_url,
    l.attestation_pdf_url,
    l.client_since,
    l.current_stage_key,
    l.selected_company_id,
    v_total_docs as total_documents,
    v_uploaded_docs as uploaded_documents,
    v_progression as progression_percentage
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND COALESCE(l.is_archived, false) = false
  LIMIT 1;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO service_role;

COMMENT ON FUNCTION public.get_lead_by_token IS 
'Récupère les informations d''un lead via son access_token avec compteurs de documents (uploaded/total)';
