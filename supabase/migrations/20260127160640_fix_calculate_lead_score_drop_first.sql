/*
  # Fix calculate_lead_score - Drop and Recreate
  
  1. Problem
    - calculate_lead_score references 'crm_leads_enhanced' which doesn't exist
    - This breaks document classification triggers
  
  2. Solution
    - Drop old function
    - Recreate with correct table reference
*/

-- Drop old function first
DROP FUNCTION IF EXISTS calculate_lead_score(uuid);

-- Recreate with correct table reference
CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score numeric := 0;
  v_lead record;
BEGIN
  -- Get lead info from crm_leads (not crm_leads_enhanced)
  SELECT * 
  INTO v_lead
  FROM crm_leads 
  WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Scoring logic
  -- Email présent : +10
  IF v_lead.email IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  
  -- Téléphone présent : +10  
  IF v_lead.phone IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  
  -- Ville renseignée : +5
  IF v_lead.city IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;
  
  -- Bonus si interactions récentes (7 derniers jours)
  IF EXISTS (
    SELECT 1 FROM crm_interactions
    WHERE lead_id = p_lead_id
    AND created_at > NOW() - INTERVAL '7 days'
  ) THEN
    v_score := v_score + 15;
  END IF;
  
  -- Bonus si documents uploadés
  IF EXISTS (
    SELECT 1 FROM crm_lead_documents
    WHERE lead_id = p_lead_id
  ) THEN
    v_score := v_score + 20;
  END IF;
  
  RETURN v_score;
END;
$$;

COMMENT ON FUNCTION calculate_lead_score IS 
'Calcule le score d''un lead basé sur données + interactions - FIXED missing table reference';
