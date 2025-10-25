/*
  ══════════════════════════════════════════════════════════════════
  FIX URGENT : Unifier Toutes Pages Villes

  OBJECTIF: Mettre à jour city_pages pour que TOUTES les villes
            utilisent le nouveau template CityPage.tsx enrichi
  ══════════════════════════════════════════════════════════════════
*/

-- Diagnostic initial
SELECT
  COUNT(*) as "Total villes",
  COUNT(*) FILTER (WHERE status = 'published') as "Publiées actuellement",
  COUNT(*) FILTER (WHERE h1_title IS NULL OR h1_title = '') as "Sans H1",
  COUNT(*) FILTER (WHERE city_name IS NULL OR city_name = '') as "Sans city_name"
FROM city_pages;

-- ════════════════════════════════════════════════════════════════
-- MISE À JOUR 1 : Publier toutes les pages
-- ════════════════════════════════════════════════════════════════

UPDATE city_pages
SET
  status = 'published',
  updated_at = NOW()
WHERE status != 'published';

-- ════════════════════════════════════════════════════════════════
-- MISE À JOUR 2 : Remplir h1_title si manquant
-- ════════════════════════════════════════════════════════════════

UPDATE city_pages
SET
  h1_title = COALESCE(h1_title, title, 'Assurance Taxi ' || city),
  updated_at = NOW()
WHERE h1_title IS NULL OR h1_title = '';

-- ════════════════════════════════════════════════════════════════
-- MISE À JOUR 3 : Remplir city_name si manquant
-- ════════════════════════════════════════════════════════════════

UPDATE city_pages
SET
  city_name = COALESCE(city_name, city),
  updated_at = NOW()
WHERE city_name IS NULL OR city_name = '';

-- ════════════════════════════════════════════════════════════════
-- MISE À JOUR 4 : Ajouter population par défaut si NULL
-- ════════════════════════════════════════════════════════════════

UPDATE city_pages
SET
  population = 100000,
  updated_at = NOW()
WHERE population IS NULL;

-- ════════════════════════════════════════════════════════════════
-- DIAGNOSTIC FINAL
-- ════════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as "Total villes",
  COUNT(*) FILTER (WHERE status = 'published') as "Publiées maintenant",
  COUNT(*) FILTER (WHERE h1_title IS NOT NULL AND h1_title != '') as "Avec H1",
  COUNT(*) FILTER (WHERE city_name IS NOT NULL AND city_name != '') as "Avec city_name",
  COUNT(*) FILTER (WHERE population IS NOT NULL) as "Avec population"
FROM city_pages;

-- Afficher quelques exemples
SELECT
  slug,
  city,
  city_name,
  status,
  LEFT(h1_title, 50) as h1_preview,
  population
FROM city_pages
ORDER BY created_at DESC
LIMIT 10;
