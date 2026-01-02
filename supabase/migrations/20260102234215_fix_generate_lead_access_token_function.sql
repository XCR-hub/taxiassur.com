/*
  # Fix generate_lead_access_token function to access extensions schema

  1. Changes
    - Update generate_lead_access_token function to include extensions in search_path
    - This fixes the "function gen_random_bytes(integer) does not exist" error
  
  2. Security
    - Maintains SECURITY DEFINER
    - No changes to security model
*/

-- Recreate function with correct search_path
CREATE OR REPLACE FUNCTION generate_lead_access_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.access_token IS NULL THEN
    NEW.access_token := encode(extensions.gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

-- Also fix get_lead_id_from_token to ensure it has proper search_path
CREATE OR REPLACE FUNCTION get_lead_id_from_token(token_value text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  lead_uuid uuid;
BEGIN
  SELECT id INTO lead_uuid
  FROM leads
  WHERE access_token = token_value;

  RETURN lead_uuid;
END;
$$;