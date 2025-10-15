/*
  FIX: Structure de la table blog_posts

  Ajoute les colonnes manquantes pour que la génération d'articles fonctionne.
*/

-- 1. Vérifier la structure actuelle
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'blog_posts'
ORDER BY ordinal_position;

-- 2. Ajouter les colonnes manquantes si elles n'existent pas

-- Colonne tags (tableau de texte pour les catégories)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'tags'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN tags text[] DEFAULT ARRAY[]::text[];
    RAISE NOTICE '✅ Colonne tags ajoutée';
  ELSE
    RAISE NOTICE '⚠️ Colonne tags existe déjà';
  END IF;
END $$;

-- Colonne faq (JSON pour les FAQ intégrées)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'faq'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN faq jsonb DEFAULT '[]'::jsonb;
    RAISE NOTICE '✅ Colonne faq ajoutée';
  ELSE
    RAISE NOTICE '⚠️ Colonne faq existe déjà';
  END IF;
END $$;

-- Colonne reading_time (temps de lecture en minutes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'reading_time'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN reading_time integer DEFAULT 5;
    RAISE NOTICE '✅ Colonne reading_time ajoutée';
  ELSE
    RAISE NOTICE '⚠️ Colonne reading_time existe déjà';
  END IF;
END $$;

-- Colonne meta_description (pour le SEO)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'meta_description'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN meta_description text;
    RAISE NOTICE '✅ Colonne meta_description ajoutée';
  ELSE
    RAISE NOTICE '⚠️ Colonne meta_description existe déjà';
  END IF;
END $$;

-- 3. Vérifier la structure finale
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable,
  '✅ OK' as status
FROM information_schema.columns
WHERE table_name = 'blog_posts'
ORDER BY ordinal_position;

-- 4. Test : Créer un article de test avec toutes les colonnes
INSERT INTO blog_posts (
  id,
  slug,
  title,
  excerpt,
  content,
  meta_description,
  tags,
  published,
  reading_time,
  faq,
  created_at,
  updated_at
) VALUES (
  'test-structure-' || extract(epoch from now())::text,
  'test-structure-blog-posts-' || to_char(now(), 'YYYY-MM-DD-HH24-MI-SS'),
  'TEST STRUCTURE : Article créé le ' || to_char(now(), 'DD/MM/YYYY à HH24:MI'),
  'Article de test pour vérifier que toutes les colonnes existent.',
  '<h2>Structure Corrigée</h2><p>Si vous voyez cet article, la structure de blog_posts est correcte !</p>',
  'Test de la structure blog_posts corrigée',
  ARRAY['test', 'structure', 'blog'],
  true,
  2,
  '[{"question":"La structure est-elle OK ?","answer":"Oui !","category":"test"}]'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  updated_at = now();

-- 5. Vérifier que l'article est créé
SELECT
  id,
  title,
  slug,
  array_length(tags, 1) as "Nb tags",
  published,
  created_at,
  '✅ Article créé avec succès !' as status
FROM blog_posts
WHERE id LIKE 'test-structure-%'
ORDER BY created_at DESC
LIMIT 1;

-- 6. Test final avec la fonction RPC
SELECT
  title,
  slug,
  array_length(tags, 1) as "Nb tags",
  reading_time,
  '✅ Visible via RPC' as status
FROM get_blog_posts()
LIMIT 3;
