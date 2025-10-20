/*
  # Fix City Pages - Ajouter la colonne region

  Problème: ERROR 42703: column "region" does not exist
  Solution: Ajouter la colonne region à la table city_pages existante
*/

-- Vérifier si la colonne existe déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'region'
  ) THEN
    -- Ajouter la colonne region
    ALTER TABLE city_pages ADD COLUMN region text;
    RAISE NOTICE 'Colonne region ajoutée avec succès';
  ELSE
    RAISE NOTICE 'Colonne region existe déjà';
  END IF;
END $$;

-- Mettre à jour les villes existantes avec leurs régions
UPDATE city_pages SET region = 'Île-de-France' WHERE department IN ('75', '92', '93', '94', '95', '77', '78', '91');
UPDATE city_pages SET region = 'Auvergne-Rhône-Alpes' WHERE department IN ('69', '42', '38', '74', '63');
UPDATE city_pages SET region = 'Provence-Alpes-Côte d''Azur' WHERE department IN ('13', '06', '83');
UPDATE city_pages SET region = 'Occitanie' WHERE department IN ('31', '34', '30', '66');
UPDATE city_pages SET region = 'Pays de la Loire' WHERE department IN ('44', '49', '72');
UPDATE city_pages SET region = 'Grand Est' WHERE department IN ('67', '51', '57', '68');
UPDATE city_pages SET region = 'Nouvelle-Aquitaine' WHERE department IN ('33', '87');
UPDATE city_pages SET region = 'Hauts-de-France' WHERE department IN ('59', '80');
UPDATE city_pages SET region = 'Bretagne' WHERE department IN ('35', '29');
UPDATE city_pages SET region = 'Bourgogne-Franche-Comté' WHERE department IN ('21', '25');
UPDATE city_pages SET region = 'Centre-Val de Loire' WHERE department IN ('37', '45');
UPDATE city_pages SET region = 'Normandie' WHERE department = '76';

-- Vérifier le résultat
SELECT name, department, region FROM city_pages ORDER BY name LIMIT 10;

-- Créer un index sur region pour performance
CREATE INDEX IF NOT EXISTS idx_city_pages_region ON city_pages(region);

-- ✅ Résultat attendu : Toutes les villes ont maintenant une région
SELECT COUNT(*) as total, region
FROM city_pages
WHERE status = 'published'
GROUP BY region
ORDER BY total DESC;
