/*
  # Ajouter colonnes manquantes à city_pages

  1. Modifications
    - Ajouter `dept` (département) - optionnel
    - Ajouter `region` (région) - optionnel
    - Ajouter `taxi_count` (nombre estimé de taxis) - optionnel

  2. Pourquoi
    - Le script populate-city-pages.js utilise ces champs
    - Nécessaires pour affichage stats et filtres régionaux

  3. Sécurité
    - Les RLS existantes restent inchangées
    - Colonnes optionnelles (NULL autorisé)
*/

-- Ajouter département
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'dept'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN dept text;
    RAISE NOTICE '✅ Colonne dept ajoutée';
  ELSE
    RAISE NOTICE '⚠️ Colonne dept existe déjà';
  END IF;
END $$;

-- Ajouter région
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'region'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN region text;
    RAISE NOTICE '✅ Colonne region ajoutée';
  ELSE
    RAISE NOTICE '⚠️ Colonne region existe déjà';
  END IF;
END $$;

-- Ajouter compteur taxis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'taxi_count'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN taxi_count integer DEFAULT 0;
    RAISE NOTICE '✅ Colonne taxi_count ajoutée';
  ELSE
    RAISE NOTICE '⚠️ Colonne taxi_count existe déjà';
  END IF;
END $$;

-- Créer indexes pour améliorer les performances des filtres
CREATE INDEX IF NOT EXISTS city_pages_dept_idx ON city_pages(dept);
CREATE INDEX IF NOT EXISTS city_pages_region_idx ON city_pages(region);
CREATE INDEX IF NOT EXISTS city_pages_taxi_count_idx ON city_pages(taxi_count DESC);

-- Vérification
DO $$
DECLARE
  col_count integer;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'city_pages'
  AND column_name IN ('dept', 'region', 'taxi_count');

  IF col_count = 3 THEN
    RAISE NOTICE '✅ Toutes les colonnes sont présentes (dept, region, taxi_count)';
  ELSE
    RAISE WARNING '⚠️ Il manque % colonne(s)', (3 - col_count);
  END IF;
END $$;
