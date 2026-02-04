/*
  # Activation des 3 compagnies d'assurance manquantes

  1. Modifications
    - Active Plus Simple (code: PLUS_SIMPLE)
    - Active Solly Azar (code: SOLLY_AZAR)  
    - Active Zéphyr (code: ZEPHIR)
    - Marque ces 3 compagnies comme obligatoires (is_mandatory = true)

  2. Compagnies actives après migration (5 au total)
    - Generali
    - 2MA
    - Plus Simple
    - Zéphyr
    - Solly Azar
*/

-- Activer et rendre obligatoires les 3 compagnies manquantes
UPDATE insurance_companies
SET 
  is_active = true,
  is_mandatory = true
WHERE code IN ('PLUS_SIMPLE', 'SOLLY_AZAR', 'ZEPHIR');

-- Vérifier qu'on a bien 5 compagnies actives
DO $$
DECLARE
  active_count integer;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM insurance_companies
  WHERE is_active = true AND is_mandatory = true;
  
  IF active_count != 5 THEN
    RAISE EXCEPTION 'Expected 5 active companies but found %', active_count;
  END IF;
  
  RAISE NOTICE '✅ 5 compagnies d''assurance sont maintenant actives';
END $$;
