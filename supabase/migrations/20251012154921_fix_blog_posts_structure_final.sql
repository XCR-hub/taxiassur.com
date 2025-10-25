/*
  # Correction finale structure blog_posts

  1. Problème
    - La table blog_posts peut avoir des données incohérentes
    - L'erreur COALESCE(slug, id) ne peut pas mélanger text et uuid
    
  2. Solution
    - Vérifier la structure actuelle
    - S'assurer que slug existe pour tous les articles
    - Recréer les politiques RLS correctement
*/

-- 1. S'assurer que tous les articles ont un slug
UPDATE blog_posts 
SET slug = 'article-' || id::text 
WHERE slug IS NULL OR slug = '';

-- 2. Supprimer les anciennes politiques (au cas où)
DROP POLICY IF EXISTS "Anonymous can read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated can read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Service role can insert posts" ON blog_posts;
DROP POLICY IF EXISTS "Service role can update posts" ON blog_posts;
DROP POLICY IF EXISTS "Allow anonymous read published posts v2" ON blog_posts;
DROP POLICY IF EXISTS "Allow anonymous read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Public can read published blog posts" ON blog_posts;

-- 3. Créer les politiques RLS correctes
CREATE POLICY "Anonymous can read published posts"
  ON blog_posts FOR SELECT
  TO anon
  USING (published = true);

CREATE POLICY "Authenticated can read published posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (published = true);

CREATE POLICY "Service role full access"
  ON blog_posts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Vérification
DO $$
DECLARE
  article_count INT;
  articles_with_slug INT;
BEGIN
  SELECT COUNT(*) INTO article_count FROM blog_posts WHERE published = true;
  SELECT COUNT(*) INTO articles_with_slug FROM blog_posts WHERE slug IS NOT NULL AND slug != '';
  
  RAISE NOTICE '✅ Articles publiés: %', article_count;
  RAISE NOTICE '✅ Articles avec slug: %', articles_with_slug;
  
  IF article_count > 0 AND articles_with_slug = article_count THEN
    RAISE NOTICE '✅ Structure blog_posts OK - tous les articles ont un slug';
  END IF;
END $$;
