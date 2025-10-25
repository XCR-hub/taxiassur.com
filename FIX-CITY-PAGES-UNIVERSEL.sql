/*
  # Fix City Pages - Universel (s'adapte à toute structure)

  Problème: Les colonnes department et region peuvent ne pas exister
  Solution: Vérifier et créer les colonnes manquantes
*/

-- ============================================
-- ÉTAPE 1 : Ajouter les colonnes manquantes
-- ============================================

-- Ajouter 'dept' si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'dept'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN dept text;
    RAISE NOTICE '✅ Colonne dept ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne dept existe déjà';
  END IF;
END $$;

-- Ajouter 'department' si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'department'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN department text;
    RAISE NOTICE '✅ Colonne department ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne department existe déjà';
  END IF;
END $$;

-- Ajouter 'region' si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'region'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN region text;
    RAISE NOTICE '✅ Colonne region ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne region existe déjà';
  END IF;
END $$;

-- ============================================
-- ÉTAPE 2 : Synchroniser dept <-> department
-- ============================================

-- Si dept existe et department est vide, copier dept vers department
UPDATE city_pages
SET department = dept
WHERE department IS NULL AND dept IS NOT NULL;

-- Si department existe et dept est vide, copier department vers dept
UPDATE city_pages
SET dept = department
WHERE dept IS NULL AND department IS NOT NULL;

-- ============================================
-- ÉTAPE 3 : Mettre à jour les régions
-- ============================================

-- Utiliser COALESCE pour gérer dept OU department
UPDATE city_pages
SET region = 'Île-de-France'
WHERE COALESCE(department, dept) IN ('75', '92', '93', '94', '95', '77', '78', '91');

UPDATE city_pages
SET region = 'Auvergne-Rhône-Alpes'
WHERE COALESCE(department, dept) IN ('69', '42', '38', '74', '63', '01', '03', '15', '43', '73', '07', '26');

UPDATE city_pages
SET region = 'Provence-Alpes-Côte d''Azur'
WHERE COALESCE(department, dept) IN ('13', '06', '83', '04', '05', '84');

UPDATE city_pages
SET region = 'Occitanie'
WHERE COALESCE(department, dept) IN ('31', '34', '30', '66', '11', '12', '32', '46', '48', '65', '81', '82');

UPDATE city_pages
SET region = 'Pays de la Loire'
WHERE COALESCE(department, dept) IN ('44', '49', '72', '53', '85');

UPDATE city_pages
SET region = 'Grand Est'
WHERE COALESCE(department, dept) IN ('67', '51', '57', '68', '08', '10', '52', '54', '55', '88');

UPDATE city_pages
SET region = 'Nouvelle-Aquitaine'
WHERE COALESCE(department, dept) IN ('33', '87', '16', '17', '19', '23', '24', '40', '47', '64', '79', '86');

UPDATE city_pages
SET region = 'Hauts-de-France'
WHERE COALESCE(department, dept) IN ('59', '80', '02', '60', '62');

UPDATE city_pages
SET region = 'Bretagne'
WHERE COALESCE(department, dept) IN ('35', '29', '22', '56');

UPDATE city_pages
SET region = 'Bourgogne-Franche-Comté'
WHERE COALESCE(department, dept) IN ('21', '25', '39', '58', '70', '71', '89', '90');

UPDATE city_pages
SET region = 'Centre-Val de Loire'
WHERE COALESCE(department, dept) IN ('37', '45', '18', '28', '36', '41');

UPDATE city_pages
SET region = 'Normandie'
WHERE COALESCE(department, dept) IN ('76', '14', '27', '50', '61');

UPDATE city_pages
SET region = 'Corse'
WHERE COALESCE(department, dept) IN ('2A', '2B', '20');

-- ============================================
-- ÉTAPE 4 : Créer les index
-- ============================================

CREATE INDEX IF NOT EXISTS idx_city_pages_dept ON city_pages(dept);
CREATE INDEX IF NOT EXISTS idx_city_pages_department ON city_pages(department);
CREATE INDEX IF NOT EXISTS idx_city_pages_region ON city_pages(region);
CREATE INDEX IF NOT EXISTS idx_city_pages_slug ON city_pages(slug);

-- ============================================
-- ÉTAPE 5 : Vérification
-- ============================================

-- Voir les colonnes créées
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'city_pages'
  AND column_name IN ('dept', 'department', 'region')
ORDER BY column_name;

-- Compter par région
SELECT region, COUNT(*) as count
FROM city_pages
WHERE region IS NOT NULL
GROUP BY region
ORDER BY count DESC;

-- Voir quelques exemples
SELECT name, dept, department, region
FROM city_pages
LIMIT 10;

-- ✅ RÉSULTAT ATTENDU :
-- - Colonnes dept, department, region présentes
-- - Toutes les villes ont une région
-- - Index créés pour performance
