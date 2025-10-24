-- =====================================================
-- FIX RLS POUR SOCIAL_POSTS
-- =====================================================
-- Corrige l'erreur 401 lors de l'accès à social_posts

-- 1️⃣ Vérifier si la table existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'social_posts') THEN
    RAISE NOTICE '❌ Table social_posts n''existe pas';
  ELSE
    RAISE NOTICE '✅ Table social_posts existe';
  END IF;
END $$;

-- 2️⃣ Activer RLS si pas déjà fait
ALTER TABLE IF EXISTS social_posts ENABLE ROW LEVEL SECURITY;

-- 3️⃣ Supprimer les anciennes policies (si existent)
DROP POLICY IF EXISTS "Allow anonymous read social_posts" ON social_posts;
DROP POLICY IF EXISTS "Allow authenticated read social_posts" ON social_posts;
DROP POLICY IF EXISTS "Allow authenticated insert social_posts" ON social_posts;
DROP POLICY IF EXISTS "Allow authenticated update social_posts" ON social_posts;
DROP POLICY IF EXISTS "Allow authenticated delete social_posts" ON social_posts;

-- 4️⃣ Créer les nouvelles policies avec accès étendu

-- SELECT : Tout le monde peut lire (anon + authenticated)
CREATE POLICY "Allow public read social_posts"
  ON social_posts
  FOR SELECT
  TO public
  USING (true);

-- INSERT : Utilisateurs authentifiés uniquement
CREATE POLICY "Allow authenticated insert social_posts"
  ON social_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE : Utilisateurs authentifiés uniquement
CREATE POLICY "Allow authenticated update social_posts"
  ON social_posts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE : Utilisateurs authentifiés uniquement
CREATE POLICY "Allow authenticated delete social_posts"
  ON social_posts
  FOR DELETE
  TO authenticated
  USING (true);

-- 5️⃣ Vérifier les policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'social_posts'
ORDER BY policyname;

-- 6️⃣ Afficher un résumé
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'social_posts';

  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ FIX RLS SOCIAL_POSTS TERMINÉ';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Nombre de policies créées : %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Accès configurés :';
  RAISE NOTICE '  - SELECT : Public (anonymous + authenticated)';
  RAISE NOTICE '  - INSERT : Authenticated uniquement';
  RAISE NOTICE '  - UPDATE : Authenticated uniquement';
  RAISE NOTICE '  - DELETE : Authenticated uniquement';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 L''erreur 401 devrait être résolue !';
  RAISE NOTICE '================================================';
END $$;
