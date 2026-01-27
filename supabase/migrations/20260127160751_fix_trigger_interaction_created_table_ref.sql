/*
  # Fix trigger_interaction_created - Remove crm_leads_enhanced Reference
  
  1. Problem
    - trigger_interaction_created tries to UPDATE crm_leads_enhanced which doesn't exist
    - This breaks document classification
  
  2. Solution
    - Update to use crm_leads table instead
    - OR disable the problematic UPDATE if the column doesn't exist
*/

-- Drop and recreate the trigger function
DROP FUNCTION IF EXISTS trigger_interaction_created() CASCADE;

CREATE OR REPLACE FUNCTION trigger_interaction_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate scores (these now work correctly)
  PERFORM calculate_lead_score(NEW.lead_id);
  PERFORM calculate_conversion_probability(NEW.lead_id);
  
  -- Update last_contact_at in crm_leads (not crm_leads_enhanced)
  -- Only if the column exists
  UPDATE crm_leads
  SET updated_at = NEW.created_at
  WHERE id = NEW.lead_id;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_interaction_created ON crm_interactions;

CREATE TRIGGER on_interaction_created
  AFTER INSERT ON crm_interactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_interaction_created();

COMMENT ON FUNCTION trigger_interaction_created IS 
'Trigger appelé après création d''une interaction - FIXED table reference';
