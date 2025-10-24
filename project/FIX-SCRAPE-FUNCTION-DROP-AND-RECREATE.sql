/*
  # Fix scrape_taxi_companies - Drop and Recreate

  1. Problem
    - Cannot change parameter name without dropping function first
    - "cannot change name of input parameter city_name"

  2. Solution
    - DROP existing function
    - CREATE new function with correct parameter naming
*/

-- ============================================================================
-- 1. DROP EXISTING FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS scrape_taxi_companies(text);
DROP FUNCTION IF EXISTS scrape_taxi_companies(city_name text);

RAISE NOTICE 'Old function dropped successfully';

-- ============================================================================
-- 2. CREATE NEW FUNCTION - No Ambiguity
-- ============================================================================

CREATE FUNCTION scrape_taxi_companies(p_city_name text)
RETURNS TABLE (
  company_name text,
  phone text,
  email text,
  address text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_company_1 text;
  v_company_2 text;
  v_company_3 text;
  v_email_base text;
BEGIN
  -- Log the scraping attempt
  RAISE NOTICE 'Scraping taxi companies for city: %', p_city_name;

  -- Prepare variables
  v_email_base := lower(regexp_replace(p_city_name, '[^a-zA-Z]', '', 'g'));
  v_company_1 := p_city_name || ' Taxi Premium';
  v_company_2 := p_city_name || ' Taxi Express';
  v_company_3 := p_city_name || ' Taxi Confort';

  -- Insert mock data for demonstration
  INSERT INTO taxi_prospects (company_name, city, phone, email, data_source, status, address)
  VALUES
    (
      v_company_1,
      p_city_name,
      '0612345678',
      'contact@' || v_email_base || 'taxi.fr',
      'google_places',
      'pending',
      '123 Avenue Principale, ' || p_city_name
    ),
    (
      v_company_2,
      p_city_name,
      '0698765432',
      'info@' || v_email_base || 'express.fr',
      'google_places',
      'pending',
      '456 Rue du Commerce, ' || p_city_name
    ),
    (
      v_company_3,
      p_city_name,
      '0687654321',
      'contact@' || v_email_base || 'confort.fr',
      'google_places',
      'pending',
      '789 Boulevard Central, ' || p_city_name
    )
  ON CONFLICT (company_name, city) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '% new taxi companies added for %', v_count, p_city_name;

  -- Return the newly added companies with explicit column names
  RETURN QUERY
  SELECT
    tp.company_name::text,
    tp.phone::text,
    tp.email::text,
    tp.address::text
  FROM taxi_prospects tp
  WHERE tp.city = p_city_name
  ORDER BY tp.created_at DESC
  LIMIT 10;
END;
$$;

COMMENT ON FUNCTION scrape_taxi_companies IS 'Scrape taxi companies for a given city (demo version with mock data)';

-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION scrape_taxi_companies TO authenticated, anon, service_role;

-- ============================================================================
-- 4. SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FUNCTION RECREATED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Function signature:';
  RAISE NOTICE '  scrape_taxi_companies(p_city_name text)';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  ✓ Old function dropped';
  RAISE NOTICE '  ✓ New function created with p_city_name parameter';
  RAISE NOTICE '  ✓ Variables used to avoid ambiguity';
  RAISE NOTICE '  ✓ Explicit column references in RETURN QUERY';
  RAISE NOTICE '  ✓ Permissions granted';
  RAISE NOTICE '';
  RAISE NOTICE 'Test now with:';
  RAISE NOTICE '  SELECT * FROM scrape_taxi_companies(''Paris'');';
  RAISE NOTICE '';
END $$;
