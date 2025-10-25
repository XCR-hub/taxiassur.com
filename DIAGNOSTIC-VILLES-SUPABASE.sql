/*
═══════════════════════════════════════════════════════════════════
🔍 DIAGNOSTIC: Pourquoi les villes IA ne s'affichent pas ?
═══════════════════════════════════════════════════════════════════

Exécuter dans: Supabase Dashboard → SQL Editor → RUN
═══════════════════════════════════════════════════════════════════
*/

-- ═════════════════════════════════════════════════════════════
-- 1️⃣ VÉRIFIER STRUCTURE DE LA TABLE city_pages
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
-- 2️⃣ COMPTER LES VILLES DANS LA BASE
-- ═════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as total_villes,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as publiees,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as brouillons,
  COUNT(CASE WHEN status IS NULL THEN 1 END) as sans_statut
FROM city_pages;

-- ═════════════════════════════════════════════════════════════
-- 3️⃣ VOIR UN ÉCHANTILLON DES VILLES (toutes colonnes)
-- ═════════════════════════════════════════════════════════════

SELECT *
FROM city_pages
LIMIT 5;

-- ═════════════════════════════════════════════════════════════
-- 4️⃣ VÉRIFIER LES PERMISSIONS RLS
-- ═════════════════════════════════════════════════════════════

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'city_pages';

-- ═════════════════════════════════════════════════════════════
-- 5️⃣ TESTER LA REQUÊTE EXACTE DU FRONTEND (comme anon)
-- ═════════════════════════════════════════════════════════════

SET ROLE anon;

SELECT
  id,
  city,
  city_name,
  slug,
  dept,
  region,
  taxi_count,
  status,
  title
FROM city_pages
WHERE status = 'published'
ORDER BY taxi_count DESC NULLS LAST;

RESET ROLE;

/*
═══════════════════════════════════════════════════════════════════
✅ INTERPRÉTATION DES RÉSULTATS
═══════════════════════════════════════════════════════════════════

1️⃣ Structure:
   - Si colonne 'city' manque → Exécuter FIX-CITY-PAGES-DISPLAY.sql
   - Si colonne 'status' manque → Problème de migration

2️⃣ Comptage:
   - Si total_villes = 0 → Aucune ville générée, utiliser le générateur IA
   - Si publiees = 0 → Villes existent mais pas publiées
   - Si sans_statut > 0 → Mettre à jour: UPDATE city_pages SET status='published'

3️⃣ Échantillon:
   - Vérifier que les données semblent correctes

4️⃣ RLS:
   - Doit avoir policy SELECT pour anon
   - Si aucune policy → Ajouter: CREATE POLICY...

5️⃣ Test anon:
   - Si 0 résultats → Problème RLS
   - Si résultats OK → Problème cache frontend

═══════════════════════════════════════════════════════════════════
*/
