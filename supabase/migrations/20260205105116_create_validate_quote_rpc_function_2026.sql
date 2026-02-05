/*
  # Create RPC function to validate quote - 2026

  1. Purpose
    - Allow prospects to validate their quotes securely via token
    - Verify token before allowing update
    - Track validation timestamp

  2. Security
    - Verifies prospect token before updating
    - Only allows updating specific fields
    - Returns success/error status
*/

-- Function to validate a quote by prospect
CREATE OR REPLACE FUNCTION validate_quote_by_token(
  p_quote_id uuid,
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_company_name text;
BEGIN
  -- Vérifier que le token est valide et récupérer le lead_id
  SELECT lcq.lead_id
  INTO v_lead_id
  FROM lead_company_quotes lcq
  INNER JOIN crm_leads cl ON cl.id = lcq.lead_id
  WHERE lcq.id = p_quote_id
  AND cl.access_token = p_token
  AND cl.access_token IS NOT NULL;

  -- Si aucun lead trouvé, token invalide
  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token invalide ou devis non trouvé'
    );
  END IF;

  -- Mettre à jour le devis
  UPDATE lead_company_quotes
  SET 
    status = 'accepted',
    quote_accepted_at = NOW()
  WHERE id = p_quote_id
  AND lead_id = v_lead_id;

  -- Récupérer le nom de la compagnie pour le message de retour
  SELECT ic.name
  INTO v_company_name
  FROM lead_company_quotes lcq
  INNER JOIN insurance_companies ic ON ic.id = lcq.company_id
  WHERE lcq.id = p_quote_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Devis validé avec succès',
    'company_name', v_company_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Donner accès à tous les utilisateurs (y compris anon)
GRANT EXECUTE ON FUNCTION validate_quote_by_token(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION validate_quote_by_token(uuid, text) TO authenticated;
