/*
  # Fix UUID generation function access

  1. Changes
    - Add extensions schema to default search_path for all roles
    - This makes gen_random_uuid() and gen_random_bytes() accessible without schema prefix
  
  2. Security
    - No security impact - only adds convenience access to standard UUID/crypto functions
    - Functions remain in extensions schema with same permissions
*/

-- Add extensions schema to search_path for public role (used by authenticated users)
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Also set for current session
SET search_path TO public, extensions;

-- Verify extensions are accessible (this will fail if not working)
DO $$
BEGIN
  -- Test gen_random_uuid
  PERFORM gen_random_uuid();
  
  -- Test gen_random_bytes  
  PERFORM gen_random_bytes(16);
  
  RAISE NOTICE 'UUID and crypto functions are now accessible';
END $$;