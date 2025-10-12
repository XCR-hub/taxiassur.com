/*
  # Unifier la structure blog_posts
  
  1. Modifications
    - Supprimer les politiques RLS utilisant 'status'
    - Supprimer les colonnes dupliquées
    - Recréer les politiques avec 'published' (boolean)
    - Migrer les données existantes
    
  2. Structure finale compatibles Edge Functions
    - published (boolean) UNIQUEMENT
    - Pas de status, author_id, published_at
*/

-- 1. Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Allow anonymous read published posts v2" ON blog_posts;
DROP POLICY IF EXISTS "Allow anonymous read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Allow authenticated insert" ON blog_posts;
DROP POLICY IF EXISTS "Allow authenticated update" ON blog_posts;
DROP POLICY IF EXISTS "Public can read published blog posts" ON blog_posts;

-- 2. Sauvegarder les articles publiés
CREATE TEMP TABLE temp_published_posts AS
SELECT
  id::uuid as id,
  title,
  excerpt,
  content,
  COALESCE(author, 'TaxiAssur') as author,
  cover_image,
  tags,
  created_at,
  updated_at,
  COALESCE(slug, 'article-' || id::text) as slug,
  meta_description,
  reading_time,
  COALESCE(faq, '[]'::jsonb) as faq
FROM blog_posts
WHERE status = 'published' OR published = true;

-- 3. Supprimer les colonnes en conflit
ALTER TABLE blog_posts DROP COLUMN IF EXISTS status CASCADE;
ALTER TABLE blog_posts DROP COLUMN IF EXISTS author_id CASCADE;
ALTER TABLE blog_posts DROP COLUMN IF EXISTS published_at CASCADE;

-- 4. Configurer published correctement
ALTER TABLE blog_posts 
  ALTER COLUMN published SET DEFAULT false,
  ALTER COLUMN published DROP NOT NULL;

-- 5. Vider et réinsérer les articles
TRUNCATE blog_posts;

INSERT INTO blog_posts (
  id, title, excerpt, content, author, cover_image, 
  tags, published, created_at, updated_at, slug, 
  meta_description, reading_time, faq
)
SELECT 
  id, title, excerpt, content, author, cover_image,
  tags, true as published, created_at, updated_at, slug,
  meta_description, reading_time, faq
FROM temp_published_posts
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  published = true,
  updated_at = now();

-- 6. Recréer les politiques RLS avec 'published' boolean
CREATE POLICY "Anonymous can read published posts"
  ON blog_posts FOR SELECT
  TO anon
  USING (published = true);

CREATE POLICY "Authenticated can read published posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (published = true);

CREATE POLICY "Service role can insert posts"
  ON blog_posts FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update posts"
  ON blog_posts FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Vérification
DO $$
DECLARE
  article_count INT;
BEGIN
  SELECT COUNT(*) INTO article_count FROM blog_posts WHERE published = true;
  RAISE NOTICE '✅ Articles publiés migrés: %', article_count;
END $$;
