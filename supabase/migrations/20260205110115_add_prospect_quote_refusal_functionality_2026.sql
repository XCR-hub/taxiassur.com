/*
  # Add Prospect Quote Refusal Functionality - 2026

  1. New Function
    - Create refuse_quote_by_token() for prospects to refuse quotes
    - Similar to validate_quote_by_token but sets status to 'refused'

  2. Columns
    - Add quote_refused_at timestamp to track refusal date
    - Add refusal_reason text to store prospect's reason

  3. Security
    - Verify token before allowing refusal
    - Track refusal timestamp and reason
*/

-- Add columns for refusal tracking
ALTER TABLE lead_company_quotes
ADD COLUMN IF NOT EXISTS quote_refused_at timestamptz,
ADD COLUMN IF NOT EXISTS refusal_reason text;

-- Create index for filtering refused quotes
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_refused 
ON lead_company_quotes(lead_id, status) 
WHERE status = 'refused';

-- Function to refuse a quote by prospect
CREATE OR REPLACE FUNCTION refuse_quote_by_token(
  p_quote_id uuid,
  p_token text,
  p_reason text DEFAULT NULL
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

  -- Mettre à jour le devis avec le statut refused
  UPDATE lead_company_quotes
  SET 
    status = 'refused',
    quote_refused_at = NOW(),
    refusal_reason = p_reason
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
    'message', 'Devis refusé',
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
GRANT EXECUTE ON FUNCTION refuse_quote_by_token(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION refuse_quote_by_token(uuid, text, text) TO authenticated;
