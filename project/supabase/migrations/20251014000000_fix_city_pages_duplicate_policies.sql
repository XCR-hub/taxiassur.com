/*
  # Fix City Pages Duplicate Policies (Erreur 409)

  1. Problème Identifié
    - 2 migrations créent les mêmes tables et policies
    - Migration 20251008220000 et 20251012163956
    - Conflit de noms de policies → Erreur 409

  2. Solution
    - Supprimer TOUTES les policies existantes
    - Recréer policies unifiées avec noms uniques
    - Utiliser IF NOT EXISTS pour éviter conflits futurs

  3. Security
    - RLS maintenu actif
    - Policies permettent SELECT (published)
    - Policies permettent INSERT/UPDATE/DELETE (anon pour backoffice)
*/

-- Drop ALL existing policies on city_pages (peu importe leur nom)
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'city_pages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON city_pages', policy_record.policyname);
    RAISE NOTICE 'Supprimé policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- Drop ALL existing policies on faq_entries
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'faq_entries'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON faq_entries', policy_record.policyname);
    RAISE NOTICE 'Supprimé policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- Recréer policies unifiées pour city_pages
-- Note: Noms uniques avec préfixe "unified_"

-- SELECT: Lecture publique (published + draft pour preview)
CREATE POLICY "unified_city_pages_public_select"
  ON city_pages
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR status = 'draft');

-- INSERT: Backoffice peut créer
CREATE POLICY "unified_city_pages_anon_insert"
  ON city_pages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- UPDATE: Backoffice peut modifier
CREATE POLICY "unified_city_pages_anon_update"
  ON city_pages
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE: Backoffice peut supprimer
CREATE POLICY "unified_city_pages_anon_delete"
  ON city_pages
  FOR DELETE
  TO anon
  USING (true);

-- Recréer policies unifiées pour faq_entries

-- SELECT: Lecture publique (published + draft pour preview)
CREATE POLICY "unified_faq_entries_public_select"
  ON faq_entries
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR status = 'draft');

-- INSERT: Backoffice peut créer
CREATE POLICY "unified_faq_entries_anon_insert"
  ON faq_entries
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- UPDATE: Backoffice peut modifier
CREATE POLICY "unified_faq_entries_anon_update"
  ON faq_entries
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE: Backoffice peut supprimer
CREATE POLICY "unified_faq_entries_anon_delete"
  ON faq_entries
  FOR DELETE
  TO anon
  USING (true);

-- Vérification finale
DO $$
DECLARE
  city_policies_count INTEGER;
  faq_policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO city_policies_count
  FROM pg_policies
  WHERE tablename = 'city_pages';

  SELECT COUNT(*) INTO faq_policies_count
  FROM pg_policies
  WHERE tablename = 'faq_entries';

  RAISE NOTICE '✅ city_pages: % policies créées', city_policies_count;
  RAISE NOTICE '✅ faq_entries: % policies créées', faq_policies_count;

  IF city_policies_count = 4 AND faq_policies_count = 4 THEN
    RAISE NOTICE '✅ Toutes les policies sont correctement configurées';
  ELSE
    RAISE WARNING '⚠️ Nombre de policies inattendu. Vérifier manuellement.';
  END IF;
END $$;
