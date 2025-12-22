/*
  # Fix City Pages - Ajouter colonnes manquantes

  Structure actuelle : id, city, title, slug, content, meta_description, keywords, status
  À ajouter : dept, region, population, taxi_count
*/

-- ============================================
-- ÉTAPE 1 : Ajouter les colonnes manquantes
-- ============================================

-- Ajouter dept
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'dept'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN dept text;
    RAISE NOTICE '✅ Colonne dept ajoutée';
  END IF;
END $$;

-- Ajouter region
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'region'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN region text;
    RAISE NOTICE '✅ Colonne region ajoutée';
  END IF;
END $$;

-- Ajouter population
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'population'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN population integer;
    RAISE NOTICE '✅ Colonne population ajoutée';
  END IF;
END $$;

-- Ajouter taxi_count
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'taxi_count'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN taxi_count integer;
    RAISE NOTICE '✅ Colonne taxi_count ajoutée';
  END IF;
END $$;

-- ============================================
-- ÉTAPE 2 : Créer les index
-- ============================================

CREATE INDEX IF NOT EXISTS idx_city_pages_dept ON city_pages(dept);
CREATE INDEX IF NOT EXISTS idx_city_pages_region ON city_pages(region);

-- ============================================
-- ÉTAPE 3 : Vérification
-- ============================================

-- Voir les colonnes ajoutées
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'city_pages'
  AND column_name IN ('city', 'dept', 'region', 'population', 'taxi_count')
ORDER BY column_name;

-- ✅ RÉSULTAT ATTENDU : dept, region, population, taxi_count disponibles
