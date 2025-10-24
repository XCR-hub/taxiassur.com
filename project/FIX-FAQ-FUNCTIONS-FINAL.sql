/*
  # FIX FAQ FUNCTIONS - DROP AND RECREATE

  Supprime les anciennes fonctions et les recrée avec le bon type de retour
*/

-- ============================================================================
-- 1. SUPPRIMER ANCIENNES FONCTIONS FAQ
-- ============================================================================

DROP FUNCTION IF EXISTS get_faq_by_city(text);
DROP FUNCTION IF EXISTS get_all_faq();

-- ============================================================================
-- 2. RECRÉER AVEC BON TYPE DE RETOUR (faq_entries)
-- ============================================================================

-- Fonction pour récupérer FAQ par ville
CREATE OR REPLACE FUNCTION get_faq_by_city(p_city text)
RETURNS SETOF faq_entries AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM faq_entries
  WHERE city = p_city
     OR city IS NULL
  ORDER BY
    CASE WHEN city = p_city THEN 0 ELSE 1 END,
    created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour récupérer toutes les FAQ
CREATE OR REPLACE FUNCTION get_all_faq()
RETURNS SETOF faq_entries AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM faq_entries
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. COMMENTAIRES
-- ============================================================================

COMMENT ON FUNCTION get_faq_by_city IS 'Récupère les FAQ pour une ville spécifique depuis faq_entries';
COMMENT ON FUNCTION get_all_faq IS 'Récupère toutes les FAQ depuis faq_entries';
