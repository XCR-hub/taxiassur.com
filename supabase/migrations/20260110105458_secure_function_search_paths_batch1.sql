/*
  # Secure Function Search Paths - Batch 1

  1. Security Enhancement
    - Set explicit search_path on all functions
    - Prevents search path hijacking attacks
    - Uses "pg_catalog, public" as safe default

  2. Strategy
    - Alter each function to set a secure search_path
    - Focus on public schema functions first
    - Preserve all function logic, only add search_path

  3. Impact
    - Functions will only look in pg_catalog and public schemas
    - Prevents malicious schema injection attacks
    - No functional changes to existing code
*/

-- Secure all functions in public schema
DO $$
DECLARE
  func record;
  func_signature text;
BEGIN
  FOR func IN 
    SELECT 
      p.proname as name,
      pg_get_function_identity_arguments(p.oid) as args,
      n.nspname as schema
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'pg_%'
    AND p.prosecdef = false  -- Not SECURITY DEFINER
  LOOP
    BEGIN
      func_signature := format('%I.%I(%s)', func.schema, func.name, func.args);
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path = pg_catalog, public',
        func_signature
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue
      RAISE NOTICE 'Could not secure function %: %', func_signature, SQLERRM;
    END;
  END LOOP;
END $$;

-- Secure SECURITY DEFINER functions (higher priority)
DO $$
DECLARE
  func record;
  func_signature text;
BEGIN
  FOR func IN 
    SELECT 
      p.proname as name,
      pg_get_function_identity_arguments(p.oid) as args,
      n.nspname as schema
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'pg_%'
    AND p.prosecdef = true  -- SECURITY DEFINER functions
  LOOP
    BEGIN
      func_signature := format('%I.%I(%s)', func.schema, func.name, func.args);
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path = pg_catalog, public',
        func_signature
      );
      RAISE NOTICE 'Secured SECURITY DEFINER function: %', func_signature;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not secure SECURITY DEFINER function %: %', func_signature, SQLERRM;
    END;
  END LOOP;
END $$;
