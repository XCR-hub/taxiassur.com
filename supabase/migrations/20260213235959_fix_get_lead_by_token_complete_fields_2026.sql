/*
  # Fix get_lead_by_token - Champs Complets

  ## Problème
  La fonction `get_lead_by_token` ne retourne pas tous les champs nécessaires
  pour l'espace prospect, causant l'erreur "Accès refusé"

  ## Solution
  Ajouter tous les champs manquants :
  - document_checklist (jsonb)
  - documents_complete (boolean)
  - quote_amount (numeric)
  - quote_accepted_at (timestamptz)
  - contract_signed_at (timestamptz)
  - payment_completed_at (timestamptz)
  - contract_pdf_url (text)
  - attestation_pdf_url (text)
  - client_since (timestamptz)
  - current_stage_key (text)
  - selected_company_id (uuid)
*/

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.get_lead_by_token(text);

-- Créer la fonction complète
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
  contract_number text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  -- Nouveaux champs pour l'espace prospect
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
  selected_company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    l.pipeline_stage,
    l.lead_score,
    l.converted_to_client,
    l.access_token,
    l.contract_number,
    l.metadata,
    l.created_at,
    l.updated_at,
    -- Nouveaux champs
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
    l.selected_company_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL
  LIMIT 1;
END;
$$;

-- Permettre l'accès anonyme
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION public.get_lead_by_token IS 
'Récupère TOUTES les informations d''un lead via son access_token pour l''espace prospect';
