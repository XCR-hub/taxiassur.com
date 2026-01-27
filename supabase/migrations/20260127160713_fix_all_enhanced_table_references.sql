/*
  # Fix All Functions Referencing crm_leads_enhanced
  
  1. Problem
    - Multiple functions reference 'crm_leads_enhanced' which doesn't exist
    - calculate_conversion_probability, calculate_engagement_score, etc.
  
  2. Solution
    - Drop and recreate all affected functions
    - Use 'crm_leads' table instead
*/

-- Drop all affected functions
DROP FUNCTION IF EXISTS calculate_conversion_probability(uuid);
DROP FUNCTION IF EXISTS calculate_engagement_score(uuid);
DROP FUNCTION IF EXISTS predict_churn_risk(uuid);

-- Recreate calculate_conversion_probability
CREATE OR REPLACE FUNCTION calculate_conversion_probability(p_lead_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_probability numeric := 0;
  v_lead record;
  v_interactions_count int;
  v_documents_count int;
BEGIN
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Base probability: 20%
  v_probability := 0.20;
  
  -- +15% if phone provided
  IF v_lead.phone IS NOT NULL THEN
    v_probability := v_probability + 0.15;
  END IF;
  
  -- +10% per interaction (max 30%)
  SELECT COUNT(*) INTO v_interactions_count
  FROM crm_interactions
  WHERE lead_id = p_lead_id;
  v_probability := v_probability + LEAST(v_interactions_count * 0.10, 0.30);
  
  -- +20% if documents uploaded
  SELECT COUNT(*) INTO v_documents_count
  FROM crm_lead_documents
  WHERE lead_id = p_lead_id;
  IF v_documents_count > 0 THEN
    v_probability := v_probability + 0.20;
  END IF;
  
  RETURN LEAST(v_probability, 1.0);
END;
$$;

-- Recreate calculate_engagement_score
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_lead_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score numeric := 0;
  v_recent_interactions int;
BEGIN
  -- Count interactions in last 30 days
  SELECT COUNT(*) INTO v_recent_interactions
  FROM crm_interactions
  WHERE lead_id = p_lead_id
  AND created_at > NOW() - INTERVAL '30 days';
  
  v_score := v_recent_interactions * 10;
  
  RETURN LEAST(v_score, 100);
END;
$$;

-- Recreate predict_churn_risk
CREATE OR REPLACE FUNCTION predict_churn_risk(p_lead_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_risk numeric := 0;
  v_days_inactive int;
  v_last_interaction timestamptz;
BEGIN
  -- Get last interaction date
  SELECT MAX(created_at) INTO v_last_interaction
  FROM crm_interactions
  WHERE lead_id = p_lead_id;
  
  IF v_last_interaction IS NULL THEN
    RETURN 0.8; -- High risk if no interactions
  END IF;
  
  v_days_inactive := EXTRACT(DAY FROM NOW() - v_last_interaction);
  
  -- Risk increases with inactivity
  IF v_days_inactive > 60 THEN
    v_risk := 0.9;
  ELSIF v_days_inactive > 30 THEN
    v_risk := 0.6;
  ELSIF v_days_inactive > 14 THEN
    v_risk := 0.3;
  ELSE
    v_risk := 0.1;
  END IF;
  
  RETURN v_risk;
END;
$$;

COMMENT ON FUNCTION calculate_conversion_probability IS 'Calcule la probabilité de conversion - FIXED table reference';
COMMENT ON FUNCTION calculate_engagement_score IS 'Calcule le score d''engagement - FIXED table reference';
COMMENT ON FUNCTION predict_churn_risk IS 'Prédit le risque de churn - FIXED table reference';
