/*
═══════════════════════════════════════════════════════════════════
⚡ FIX: Affichage Pages Villes depuis Supabase
═══════════════════════════════════════════════════════════════════

PROBLÈME:
- Page /villes affiche seulement villes hardcodées
- Villes générées par IA en Supabase pas visibles

SOLUTION:
1. Vérifier structure city_pages
2. Ajouter colonne 'city' si manquante (alias de city_name)
3. Vérifier les données existantes
4. Tester requête SELECT

COPIER/COLLER DANS: Supabase Dashboard → SQL Editor → RUN
═══════════════════════════════════════════════════════════════════
*/

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 1: Diagnostic de la structure actuelle
-- ═════════════════════════════════════════════════════════════

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'city_pages'
ORDER BY ordinal_position;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 2: Compter les villes publiées
-- ═════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as total_villes,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as publiees,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as brouillons
FROM city_pages;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 3: Ajouter colonne 'city' si manquante (pour compatibilité)
-- ═════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Ajouter colonne 'city' si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'city'
  ) THEN
    -- Si city_name existe, créer city comme alias
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'city_pages' AND column_name = 'city_name'
    ) THEN
      ALTER TABLE city_pages ADD COLUMN city text;
      UPDATE city_pages SET city = city_name WHERE city IS NULL;
      RAISE NOTICE '✅ Colonne city ajoutée et synchronisée depuis city_name';
    ELSE
      -- Sinon ajouter city directement
      ALTER TABLE city_pages ADD COLUMN city text;
      RAISE NOTICE '✅ Colonne city ajoutée';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Colonne city existe déjà';
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 4: Ajouter colonne 'title' si manquante
-- ═════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'title'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN title text;
    -- Générer title depuis city ou city_name
    UPDATE city_pages
    SET title = 'Assurance Taxi ' || COALESCE(city, city_name, slug)
    WHERE title IS NULL;
    RAISE NOTICE '✅ Colonne title ajoutée';
  ELSE
    RAISE NOTICE '⚠️ Colonne title existe déjà';
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 5: Ajouter colonne 'meta_description' si manquante
-- ═════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'meta_description'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN meta_description text;
    RAISE NOTICE '✅ Colonne meta_description ajoutée';
  ELSE
    RAISE NOTICE '⚠️ Colonne meta_description existe déjà';
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 6: Synchroniser city_name → city (si city_name existe)
-- ═════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'city_name'
  ) THEN
    UPDATE city_pages
    SET city = city_name
    WHERE city IS NULL AND city_name IS NOT NULL;
    RAISE NOTICE '✅ Colonne city synchronisée depuis city_name';
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 7: Tester la requête exacte utilisée par le frontend
-- ═════════════════════════════════════════════════════════════

SELECT
  id,
  COALESCE(city, city_name) as city,
  slug,
  dept,
  region,
  taxi_count,
  status,
  title,
  meta_description,
  created_at
FROM city_pages
WHERE status = 'published'
ORDER BY taxi_count DESC NULLS LAST
LIMIT 20;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 8: Statistiques par région
-- ═════════════════════════════════════════════════════════════

SELECT
  region,
  COUNT(*) as nombre_villes,
  SUM(taxi_count) as total_taxis,
  string_agg(COALESCE(city, city_name), ', ' ORDER BY taxi_count DESC) as villes
FROM city_pages
WHERE status = 'published'
GROUP BY region
ORDER BY nombre_villes DESC;

/*
═══════════════════════════════════════════════════════════════════
✅ RÉSULTATS ATTENDUS
═══════════════════════════════════════════════════════════════════

1. Structure: Colonnes city, dept, region, taxi_count, status, title
2. Count: Au moins quelques villes publiées
3. SELECT: Liste des villes avec toutes les infos
4. Stats: Villes groupées par région

Si vous voyez des villes dans les résultats → PARFAIT ! ✅
Si 0 villes → Les villes n'ont pas été générées, lancer le générateur IA

Puis actualiser https://taxiassur.com/villes
═══════════════════════════════════════════════════════════════════
*/
