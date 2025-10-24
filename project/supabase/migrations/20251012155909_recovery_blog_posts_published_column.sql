/*
  # Récupération colonne published dans blog_posts

  1. Problème
    - La colonne published peut avoir été supprimée par une migration précédente
    - Erreur: column "published" does not exist
    
  2. Solution
    - Vérifier si la colonne published existe
    - La recréer si nécessaire
    - Migrer les données depuis published_at si présent
*/

-- 1. Ajouter la colonne published si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'published'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN published boolean DEFAULT true;
    RAISE NOTICE '✅ Colonne published ajoutée';
    
    -- Si published_at existe, l'utiliser pour définir published
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'blog_posts' AND column_name = 'published_at'
    ) THEN
      UPDATE blog_posts SET published = (published_at IS NOT NULL);
      RAISE NOTICE '✅ Données migrées depuis published_at';
    END IF;
  ELSE
    RAISE NOTICE '✅ Colonne published existe déjà';
  END IF;
END $$;

-- 2. Supprimer les colonnes obsolètes si elles existent
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'status'
  ) THEN
    ALTER TABLE blog_posts DROP COLUMN status CASCADE;
    RAISE NOTICE '✅ Colonne status supprimée';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE blog_posts DROP COLUMN published_at CASCADE;
    RAISE NOTICE '✅ Colonne published_at supprimée';
  END IF;
END $$;

-- 3. S'assurer que slug existe pour tous les articles
UPDATE blog_posts 
SET slug = 'article-' || id::text 
WHERE slug IS NULL OR slug = '';

-- 4. Recréer les politiques RLS proprement
DROP POLICY IF EXISTS "Anonymous can read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated can read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Service role full access" ON blog_posts;
DROP POLICY IF EXISTS "Articles publiés visibles par tous" ON blog_posts;
DROP POLICY IF EXISTS "Tous les articles visibles pour les authentifiés" ON blog_posts;
DROP POLICY IF EXISTS "Insertion d'articles pour les authentifiés" ON blog_posts;
DROP POLICY IF EXISTS "Mise à jour d'articles pour les authentifiés" ON blog_posts;
DROP POLICY IF EXISTS "Suppression d'articles pour les authentifiés" ON blog_posts;

CREATE POLICY "Public can read published blog posts"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE POLICY "Service role has full access"
  ON blog_posts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Vérification finale
DO $$
DECLARE
  article_count INT;
  published_count INT;
BEGIN
  SELECT COUNT(*) INTO article_count FROM blog_posts;
  SELECT COUNT(*) INTO published_count FROM blog_posts WHERE published = true;
  
  RAISE NOTICE '✅ Total articles: %', article_count;
  RAISE NOTICE '✅ Articles publiés: %', published_count;
  RAISE NOTICE '✅ Migration de récupération terminée avec succès';
END $$;
