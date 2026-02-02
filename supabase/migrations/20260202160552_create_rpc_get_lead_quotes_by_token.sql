/*
  # Fonction RPC pour récupérer les devis d'un lead via token

  1. Nouvelle Fonction
    - `get_lead_quotes_by_token`: Retourne les devis d'un lead via son token
    - Sécurisée avec vérification du token
    - Retourne uniquement les devis avec fichiers uploadés

  2. Sécurité
    - Vérifie que le token est valide
    - Retourne uniquement les devis du lead correspondant au token
    - Filtre les devis avec statut quote_submitted ou validated
*/

-- Fonction pour récupérer les devis d'un lead via son token
CREATE OR REPLACE FUNCTION get_lead_quotes_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  company_id uuid,
  status text,
  quote_file_url text,
  quote_amount numeric,
  refusal_reason text,
  submitted_at timestamptz,
  validated_at timestamptz,
  sent_to_client_at timestamptz,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Vérifier que le token existe et récupérer le lead_id
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide ou expiré';
  END IF;

  -- Retourner les devis du lead
  RETURN QUERY
  SELECT
    lcq.id,
    lcq.lead_id,
    lcq.company_id,
    lcq.status::text,
    lcq.quote_file_url,
    lcq.quote_amount,
    lcq.refusal_reason,
    lcq.submitted_at,
    lcq.validated_at,
    lcq.sent_to_client_at,
    lcq.notes,
    lcq.created_at
  FROM lead_company_quotes lcq
  WHERE lcq.lead_id = v_lead_id
    AND lcq.status IN ('quote_submitted', 'validated')
    AND lcq.quote_file_url IS NOT NULL
  ORDER BY lcq.created_at DESC;
END;
$$;
