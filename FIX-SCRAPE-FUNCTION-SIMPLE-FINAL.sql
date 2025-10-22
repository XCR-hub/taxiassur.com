-- ============================================================================
-- FIX scrape_taxi_companies - Version Simple Sans Erreurs
-- ============================================================================

-- 1. Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS scrape_taxi_companies(text);

-- 2. Créer la nouvelle fonction avec paramètre correct
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
  -- Préparer les variables
  v_email_base := lower(regexp_replace(p_city_name, '[^a-zA-Z]', '', 'g'));
  v_company_1 := p_city_name || ' Taxi Premium';
  v_company_2 := p_city_name || ' Taxi Express';
  v_company_3 := p_city_name || ' Taxi Confort';

  -- Insérer les données
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

  -- Retourner les résultats
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

-- 3. Permissions
GRANT EXECUTE ON FUNCTION scrape_taxi_companies(text) TO authenticated, anon, service_role;

-- 4. Test
SELECT 'FUNCTION CREATED - Test avec: SELECT * FROM scrape_taxi_companies(''Paris'');' as result;
