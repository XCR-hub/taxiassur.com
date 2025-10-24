/*
  # Nettoyage et simplification des policies RLS pour blog_posts

  1. Problème
    - Policies en doublon
    - Manque de policies pour UPDATE et DELETE
    - Erreurs 400 sur les requêtes
    
  2. Solution
    - Supprimer toutes les policies existantes
    - Créer un set propre et minimal de policies
    - Permettre anon de lire tous les articles (published ou non pour le backoffice)
    - Permettre service_role de tout faire
*/

-- 1. Supprimer toutes les policies existantes
DROP POLICY IF EXISTS "Anonymous can read all blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Public can read published blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Authentifiés peuvent insérer des articles" ON blog_posts;
DROP POLICY IF EXISTS "Service role peut insérer des articles" ON blog_posts;
DROP POLICY IF EXISTS "Service role has full access" ON blog_posts;
DROP POLICY IF EXISTS "Articles publiés visibles par tous" ON blog_posts;
DROP POLICY IF EXISTS "Tous les articles visibles pour les authentifiés" ON blog_posts;
DROP POLICY IF EXISTS "Insertion d'articles pour les authentifiés" ON blog_posts;
DROP POLICY IF EXISTS "Mise à jour d'articles pour les authentifiés" ON blog_posts;
DROP POLICY IF EXISTS "Suppression d'articles pour les authentifiés" ON blog_posts;
DROP POLICY IF EXISTS "Anonymous can read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated can read published posts" ON blog_posts;

-- 2. Créer les policies propres et simples
-- Lecture publique pour tous les articles (y compris drafts pour le backoffice en lecture seule)
CREATE POLICY "Allow public read all articles"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role a tous les droits (utilisé par le backoffice authentifié)
CREATE POLICY "Service role full access"
  ON blog_posts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Vérification
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'blog_posts';
  RAISE NOTICE '✅ Nombre de policies actives: %', policy_count;
  RAISE NOTICE '✅ Policies RLS nettoyées et simplifiées';
END $$;
