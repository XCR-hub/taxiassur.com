/*
  # Fix Espace Prospect - Accès par Token

  ## Problème
  La fonction `get_lead_by_token` n'existe pas, causant l'erreur "Accès refusé"

  ## Solution
  1. Créer la fonction RPC `get_lead_by_token` pour l'espace prospect
  2. Permettre l'accès anonyme via token
  3. Retourner toutes les informations nécessaires du lead

  ## Sécurité
  - Fonction accessible en mode anonyme (anon role)
  - Vérifie que le token existe
  - Ne retourne les données que si le token est valide
*/

-- Créer la fonction get_lead_by_token
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
    l.status,
    l.pipeline_stage,
    l.lead_score,
    l.converted_to_client,
    l.access_token,
    l.contract_number,
    l.metadata,
    l.created_at,
    l.updated_at
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL
  LIMIT 1;
END;
$$;

-- Permettre l'accès anonyme à cette fonction
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION public.get_lead_by_token IS 
'Récupère les informations d''un lead via son access_token pour l''espace prospect';
