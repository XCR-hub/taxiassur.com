/*
  # Fix email auto-match trigger
  
  1. Problem
    - BEFORE trigger trying to insert into email_lead_mapping with NEW.id
    - Foreign key fails because email record doesn't exist yet
  
  2. Solution
    - Change to AFTER trigger for the mapping insert
    - Keep lead_id assignment in BEFORE trigger
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_auto_match_email ON email_messages;

-- Create improved BEFORE trigger (only sets lead_id, no mapping insert)
CREATE OR REPLACE FUNCTION auto_match_email_to_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_lead_id uuid;
BEGIN
  -- Search for matching lead by email
  SELECT id INTO matched_lead_id
  FROM crm_leads
  WHERE email = NEW.from_email
  LIMIT 1;

  IF matched_lead_id IS NOT NULL THEN
    NEW.lead_id := matched_lead_id;
    NEW.auto_matched := true;
  ELSE
    -- Search in leads table too
    SELECT id INTO matched_lead_id
    FROM leads
    WHERE email = NEW.from_email
    LIMIT 1;
    
    IF matched_lead_id IS NOT NULL THEN
      NEW.lead_id := matched_lead_id;
      NEW.auto_matched := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create AFTER trigger for mapping (separate function)
CREATE OR REPLACE FUNCTION create_email_lead_mapping()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND NEW.auto_matched = true THEN
    INSERT INTO email_lead_mapping (email_id, lead_id, matched_by, confidence_score)
    VALUES (NEW.id, NEW.lead_id, 'email', 1.0)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate BEFORE trigger for lead matching
CREATE TRIGGER trigger_auto_match_email
  BEFORE INSERT ON email_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_match_email_to_lead();

-- Create AFTER trigger for mapping
DROP TRIGGER IF EXISTS trigger_create_email_mapping ON email_messages;
CREATE TRIGGER trigger_create_email_mapping
  AFTER INSERT ON email_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_email_lead_mapping();