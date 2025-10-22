/*
  # Ajouter colonne featured_image aux blog_posts

  Ajoute la colonne pour les images de couverture des articles
  et met à jour la fonction get_blog_posts pour l'inclure.
*/

-- Ajouter colonne featured_image si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'featured_image'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN featured_image text;
    RAISE NOTICE '✅ Colonne featured_image ajoutée';
  ELSE
    RAISE NOTICE '⚠️ Colonne featured_image existe déjà';
  END IF;
END $$;

-- Ajouter colonne author si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'author'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN author text DEFAULT 'TaxiAssur';
    RAISE NOTICE '✅ Colonne author ajoutée';
  ELSE
    RAISE NOTICE '⚠️ Colonne author existe déjà';
  END IF;
END $$;

-- Mettre à jour la fonction get_blog_posts pour inclure featured_image
CREATE OR REPLACE FUNCTION get_blog_posts()
RETURNS TABLE (
  id text,
  slug text,
  title text,
  excerpt text,
  content text,
  meta_description text,
  tags text[],
  published boolean,
  reading_time integer,
  faq jsonb,
  featured_image text,
  author text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    bp.meta_description,
    bp.tags,
    bp.published,
    bp.reading_time,
    bp.faq,
    COALESCE(bp.featured_image,
      'https://images.pexels.com/photos/6169668/pexels-photo-6169668.jpeg?auto=compress&cs=tinysrgb&w=800') as featured_image,
    COALESCE(bp.author, 'TaxiAssur') as author,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE bp.published = true
  ORDER BY bp.created_at DESC;
END;
$$;

-- Mettre à jour la fonction get_blog_post_by_slug
CREATE OR REPLACE FUNCTION get_blog_post_by_slug(p_slug text)
RETURNS TABLE (
  id text,
  slug text,
  title text,
  excerpt text,
  content text,
  meta_description text,
  tags text[],
  published boolean,
  reading_time integer,
  faq jsonb,
  featured_image text,
  author text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    bp.meta_description,
    bp.tags,
    bp.published,
    bp.reading_time,
    bp.faq,
    COALESCE(bp.featured_image,
      'https://images.pexels.com/photos/6169668/pexels-photo-6169668.jpeg?auto=compress&cs=tinysrgb&w=800') as featured_image,
    COALESCE(bp.author, 'TaxiAssur') as author,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE bp.slug = p_slug AND bp.published = true
  LIMIT 1;
END;
$$;

-- Générer des images Pexels pour les articles existants sans image
UPDATE blog_posts
SET featured_image = CASE
  WHEN LOWER(title) LIKE '%paris%' THEN 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN LOWER(title) LIKE '%taxi%' AND LOWER(title) LIKE '%électrique%' THEN 'https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN LOWER(title) LIKE '%sinistre%' OR LOWER(title) LIKE '%accident%' THEN 'https://images.pexels.com/photos/2526105/pexels-photo-2526105.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN LOWER(title) LIKE '%flotte%' THEN 'https://images.pexels.com/photos/3586966/pexels-photo-3586966.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN LOWER(title) LIKE '%jeune%' OR LOWER(title) LIKE '%conducteur%' THEN 'https://images.pexels.com/photos/1152500/pexels-photo-1152500.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN LOWER(title) LIKE '%vtc%' THEN 'https://images.pexels.com/photos/3593923/pexels-photo-3593923.jpeg?auto=compress&cs=tinysrgb&w=800'
  WHEN LOWER(title) LIKE '%rc pro%' OR LOWER(title) LIKE '%responsabilité%' THEN 'https://images.pexels.com/photos/7651928/pexels-photo-7651928.jpeg?auto=compress&cs=tinysrgb&w=800'
  ELSE 'https://images.pexels.com/photos/6169668/pexels-photo-6169668.jpeg?auto=compress&cs=tinysrgb&w=800'
END
WHERE featured_image IS NULL;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS blog_posts_featured_image_idx ON blog_posts(featured_image) WHERE featured_image IS NOT NULL;

-- Résumé
DO $$
DECLARE
  total_posts INTEGER;
  posts_with_image INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_posts FROM blog_posts;
  SELECT COUNT(*) INTO posts_with_image FROM blog_posts WHERE featured_image IS NOT NULL;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ IMAGES BLOG CONFIGURÉES';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Articles total: %', total_posts;
  RAISE NOTICE 'Articles avec image: %', posts_with_image;
  RAISE NOTICE '';
  RAISE NOTICE '📸 Images Pexels attribuées automatiquement';
  RAISE NOTICE '✅ Fonction get_blog_posts mise à jour';
  RAISE NOTICE '✅ Fonction get_blog_post_by_slug mise à jour';
  RAISE NOTICE '';
  RAISE NOTICE 'Les articles affichent maintenant des images !';
  RAISE NOTICE '============================================';
END $$;
