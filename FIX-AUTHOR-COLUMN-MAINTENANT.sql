/*
  # FIX URGENT - Colonne author dans blog_posts

  Erreur actuelle: "COALESCE types uuid and integer cannot be matched"
  Cause: La colonne author est en UUID mais l'application envoie du TEXT

  Solution: Convertir en TEXT
*/

-- 1. Vérifier le type actuel
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'blog_posts'
  AND column_name = 'author';

-- 2. Convertir en TEXT
ALTER TABLE blog_posts
ALTER COLUMN author TYPE TEXT USING COALESCE(author::TEXT, 'TaxiAssur');

-- 3. Définir valeur par défaut
ALTER TABLE blog_posts
ALTER COLUMN author SET DEFAULT 'TaxiAssur';

-- 4. Autoriser NULL
ALTER TABLE blog_posts
ALTER COLUMN author DROP NOT NULL;

-- 5. Vérifier le résultat
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'blog_posts'
  AND column_name = 'author';

-- 6. Test d'insertion
INSERT INTO blog_posts (
  title,
  slug,
  excerpt,
  content,
  published,
  author
)
VALUES (
  'Test article',
  'test-article-' || EXTRACT(EPOCH FROM NOW())::TEXT,
  'Test excerpt',
  '<p>Test content</p>',
  true,
  'TaxiAssur'
)
ON CONFLICT (slug) DO NOTHING
RETURNING id, title, author;

-- Si ça fonctionne, vous verrez l'article créé avec author='TaxiAssur'
