/*
  # Fix get_lead_by_token - Colonnes Réelles Uniquement

  ## Problème
  La fonction essaie d'accéder à des colonnes qui n'existent pas :
  - document_checklist, documents_complete, quote_accepted_at, etc.

  ## Solution
  Retourner UNIQUEMENT les colonnes qui existent vraiment dans crm_leads
*/

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.get_lead_by_token(text);

-- Créer la fonction avec SEULEMENT les colonnes existantes
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
  immatriculation text,
  status text,
  pipeline_stage text,
  lead_score integer,
  converted_to_client boolean,
  access_token text,
  contract_number text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
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
    l.immatriculation,
    l.status,
    l.pipeline_stage,
    l.lead_score,
    COALESCE(l.converted_to_client, false) as converted_to_client,
    l.access_token,
    l.contract_number,
    COALESCE(l.metadata, '{}'::jsonb) as metadata,
    l.created_at,
    l.updated_at
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
'Récupère les informations d''un lead via son access_token pour l''espace prospect (colonnes réelles uniquement)';
