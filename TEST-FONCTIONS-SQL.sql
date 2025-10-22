-- ============================================================================
-- TEST DES 3 FONCTIONS SQL - VÉRIFICATION COMPLÈTE
-- ============================================================================

-- TEST 1: Vérifier que les 3 fonctions existent
-- ============================================================================
SELECT
  routine_name AS "Fonction",
  routine_type AS "Type",
  data_type AS "Type de retour"
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('scrape_taxi_companies', 'publish_to_social_media', 'generate_blog_post_ai')
ORDER BY routine_name;

-- Résultat attendu: 3 lignes avec les 3 fonctions


-- TEST 2: Vérifier la contrainte UNIQUE sur taxi_prospects
-- ============================================================================
SELECT
  conname AS "Nom contrainte",
  contype AS "Type",
  pg_get_constraintdef(oid) AS "Définition"
FROM pg_constraint
WHERE conname = 'taxi_prospects_company_city_unique';

-- Résultat attendu: 1 ligne avec UNIQUE(company_name, city)


-- TEST 3: Test de scrape_taxi_companies (Paris)
-- ============================================================================
SELECT * FROM scrape_taxi_companies('Paris');

-- Résultat attendu: 3 compagnies de taxi à Paris


-- TEST 4: Vérifier que les données ont été insérées
-- ============================================================================
SELECT
  company_name,
  city,
  phone,
  email,
  data_source,
  status
FROM taxi_prospects
WHERE city = 'Paris'
ORDER BY created_at DESC
LIMIT 10;

-- Résultat attendu: Au moins 3 compagnies de taxi


-- TEST 5: Test de publish_to_social_media
-- ============================================================================
SELECT publish_to_social_media(
  'linkedin',
  'Test de publication automatique sur LinkedIn depuis Supabase',
  'https://taxiassur.com'
);

-- Résultat attendu: {"success": true, "post_id": "..."}


-- TEST 6: Vérifier la publication dans social_posts
-- ============================================================================
SELECT
  id,
  platform,
  content,
  url,
  status,
  created_at
FROM social_posts
WHERE platform = 'linkedin'
ORDER BY created_at DESC
LIMIT 3;

-- Résultat attendu: 1 post LinkedIn avec le contenu de test


-- TEST 7: Test de generate_blog_post_ai
-- ============================================================================
SELECT generate_blog_post_ai(
  'Assurance Taxi 2025',
  'taxi insurance guide tips'
);

-- Résultat attendu: {"success": true, "post_id": "..."}


-- TEST 8: Vérifier l'article de blog généré
-- ============================================================================
SELECT
  id,
  title,
  slug,
  excerpt,
  status,
  published,
  created_at
FROM blog_posts
WHERE title ILIKE '%Assurance Taxi 2025%'
ORDER BY created_at DESC
LIMIT 3;

-- Résultat attendu: 1 article avec le titre "Assurance Taxi 2025"


-- TEST 9: Tester anti-doublon sur taxi_prospects
-- ============================================================================
-- Essayer d'insérer à nouveau Paris (devrait être ignoré)
SELECT * FROM scrape_taxi_companies('Paris');

-- Compter les doublons
SELECT
  company_name,
  city,
  COUNT(*) as nb_doublons
FROM taxi_prospects
WHERE city = 'Paris'
GROUP BY company_name, city
HAVING COUNT(*) > 1;

-- Résultat attendu: 0 lignes (pas de doublons)


-- TEST 10: Statistiques globales
-- ============================================================================
SELECT
  'taxi_prospects' AS table_name,
  COUNT(*) AS total_lignes,
  COUNT(DISTINCT city) AS villes_uniques,
  COUNT(DISTINCT company_name) AS compagnies_uniques
FROM taxi_prospects

UNION ALL

SELECT
  'social_posts' AS table_name,
  COUNT(*) AS total_lignes,
  COUNT(DISTINCT platform) AS platforms_uniques,
  NULL AS compagnies_uniques
FROM social_posts

UNION ALL

SELECT
  'blog_posts' AS table_name,
  COUNT(*) AS total_lignes,
  COUNT(DISTINCT status) AS statuts_uniques,
  NULL AS compagnies_uniques
FROM blog_posts;

-- Résultat attendu: 3 lignes avec statistiques de chaque table


-- ============================================================================
-- RÉSULTATS ATTENDUS - TOUT FONCTIONNE SI:
-- ============================================================================
-- ✅ TEST 1: 3 fonctions trouvées
-- ✅ TEST 2: 1 contrainte UNIQUE trouvée
-- ✅ TEST 3: 3 compagnies retournées
-- ✅ TEST 4: Au moins 3 lignes dans taxi_prospects
-- ✅ TEST 5: {"success": true, "post_id": "..."}
-- ✅ TEST 6: 1 post LinkedIn créé
-- ✅ TEST 7: {"success": true, "post_id": "..."}
-- ✅ TEST 8: 1 article de blog créé
-- ✅ TEST 9: 0 doublons (contrainte UNIQUE fonctionne)
-- ✅ TEST 10: Statistiques affichées

-- ============================================================================
-- 🎯 EXÉCUTION:
-- ============================================================================
-- 1. Ouvre Supabase SQL Editor
-- 2. Copie/colle ce fichier complet
-- 3. Sélectionne "No limit" dans le dropdown
-- 4. Clique sur RUN
-- 5. Vérifie les 10 résultats
