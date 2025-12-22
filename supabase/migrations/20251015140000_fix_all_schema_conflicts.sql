/*
  # Correction Finale - Conflits de Schéma

  ## Problèmes
  1. Erreur 409 sur faq_entries - colonnes dupliquées
  2. Erreur image_alt n'existe pas dans get_blog_post_by_slug
  3. Fonctions get_blog_posts() avec mauvaise signature

  ## Solution
  - DROP et recréation propre de toutes les fonctions problématiques
  - Normalisation des colonnes faq_entries
  - S'assurer que image_alt existe dans blog_posts
*/

-- ============================================================================
-- 1. VÉRIFIER ET CORRIGER TABLE BLOG_POSTS
-- ============================================================================

-- Ajouter featured_image si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'featured_image'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN featured_image text;
  END IF;
END $$;

-- Ajouter image_alt si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'image_alt'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN image_alt text;
  END IF;
END $$;

-- ============================================================================
-- 2. CORRIGER TABLE FAQ_ENTRIES - Normaliser colonnes
-- ============================================================================

-- Renommer display_order vers order_index si nécessaire
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq_entries' AND column_name = 'display_order'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq_entries' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE faq_entries RENAME COLUMN display_order TO order_index;
  END IF;
END $$;

-- Ajouter order_index si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq_entries' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE faq_entries ADD COLUMN order_index integer DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- 3. DROP ET RECRÉER TOUTES LES FONCTIONS BLOG_POSTS
-- ============================================================================

-- Drop toutes les variantes de get_blog_posts
DROP FUNCTION IF EXISTS get_blog_posts() CASCADE;
DROP FUNCTION IF EXISTS get_blog_posts(integer) CASCADE;
DROP FUNCTION IF EXISTS get_blog_posts(integer, integer) CASCADE;

-- Drop toutes les variantes de get_blog_post_by_slug
DROP FUNCTION IF EXISTS get_blog_post_by_slug(text) CASCADE;

-- Recréer get_blog_posts() - Version simple sans paramètres
CREATE OR REPLACE FUNCTION get_blog_posts()
RETURNS TABLE (
  id text,
  slug text,
  title text,
  excerpt text,
  content text,
  author text,
  featured_image text,
  meta_description text,
  meta_title text,
  keywords text[],
  tags text[],
  published boolean,
  reading_time integer,
  read_time integer,
  faq jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    bp.id::text,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    COALESCE(bp.author, 'TaxiAssur') as author,
    bp.featured_image,
    bp.meta_description,
    bp.meta_title,
    COALESCE(bp.keywords, ARRAY[]::text[]) as keywords,
    COALESCE(bp.tags, ARRAY[]::text[]) as tags,
    COALESCE(bp.published, false) as published,
    COALESCE(bp.reading_time, bp.read_time, 5) as reading_time,
    COALESCE(bp.read_time, bp.reading_time, 5) as read_time,
    COALESCE(bp.faq, '[]'::jsonb) as faq,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE COALESCE(bp.published, false) = true
  ORDER BY bp.created_at DESC;
$$;

-- Recréer get_blog_post_by_slug(slug)
CREATE OR REPLACE FUNCTION get_blog_post_by_slug(p_slug text)
RETURNS TABLE (
  id text,
  slug text,
  title text,
  excerpt text,
  content text,
  author text,
  featured_image text,
  image_alt text,
  meta_description text,
  meta_title text,
  keywords text[],
  tags text[],
  published boolean,
  reading_time integer,
  read_time integer,
  faq jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    bp.id::text,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    COALESCE(bp.author, 'TaxiAssur') as author,
    bp.featured_image,
    bp.image_alt,
    bp.meta_description,
    bp.meta_title,
    COALESCE(bp.keywords, ARRAY[]::text[]) as keywords,
    COALESCE(bp.tags, ARRAY[]::text[]) as tags,
    COALESCE(bp.published, false) as published,
    COALESCE(bp.reading_time, bp.read_time, 5) as reading_time,
    COALESCE(bp.read_time, bp.reading_time, 5) as read_time,
    COALESCE(bp.faq, '[]'::jsonb) as faq,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE bp.slug = p_slug AND COALESCE(bp.published, false) = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_blog_posts IS 'Récupère tous les articles de blog publiés avec images';
COMMENT ON FUNCTION get_blog_post_by_slug IS 'Récupère un article de blog par son slug avec image et alt';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_blog_posts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(text) TO anon, authenticated;

-- ============================================================================
-- 4. DROP ET RECRÉER FONCTIONS FAQ_ENTRIES
-- ============================================================================

DROP FUNCTION IF EXISTS get_faq_entries() CASCADE;
DROP FUNCTION IF EXISTS get_faq_by_category(text) CASCADE;

-- Fonction: Récupérer toutes les FAQ publiées
CREATE OR REPLACE FUNCTION get_faq_entries()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  order_index integer,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    id,
    question,
    answer,
    category,
    COALESCE(order_index, 0) as order_index,
    COALESCE(tags, ARRAY[]::text[]) as tags,
    created_at,
    updated_at
  FROM faq_entries
  WHERE COALESCE(status, 'draft') = 'published'
  ORDER BY COALESCE(order_index, 0) ASC, created_at DESC;
$$;

-- Fonction: Récupérer FAQ par catégorie
CREATE OR REPLACE FUNCTION get_faq_by_category(p_category text)
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  order_index integer,
  tags text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    id,
    question,
    answer,
    category,
    COALESCE(order_index, 0) as order_index,
    COALESCE(tags, ARRAY[]::text[]) as tags
  FROM faq_entries
  WHERE category = p_category
    AND COALESCE(status, 'draft') = 'published'
  ORDER BY COALESCE(order_index, 0) ASC;
$$;

GRANT EXECUTE ON FUNCTION get_faq_entries() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_faq_by_category(text) TO anon, authenticated;

-- ============================================================================
-- 5. CRÉER FONCTION UPSERT BLOG POST SÉCURISÉE
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_blog_post(
  p_id text,
  p_slug text,
  p_title text,
  p_excerpt text,
  p_content text,
  p_author text DEFAULT 'TaxiAssur',
  p_featured_image text DEFAULT NULL,
  p_image_alt text DEFAULT NULL,
  p_meta_description text DEFAULT NULL,
  p_meta_title text DEFAULT NULL,
  p_keywords text[] DEFAULT ARRAY[]::text[],
  p_tags text[] DEFAULT ARRAY[]::text[],
  p_published boolean DEFAULT true,
  p_reading_time integer DEFAULT 5,
  p_faq jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_now timestamptz := now();
BEGIN
  -- Convertir string ID en UUID
  IF p_id IS NOT NULL AND p_id != '' THEN
    v_id := p_id::uuid;
  ELSE
    v_id := gen_random_uuid();
  END IF;

  -- Upsert
  INSERT INTO blog_posts (
    id, slug, title, excerpt, content, author,
    featured_image, image_alt,
    meta_description, meta_title, keywords, tags,
    published, reading_time, read_time, faq,
    created_at, updated_at
  ) VALUES (
    v_id, p_slug, p_title, p_excerpt, p_content, p_author,
    p_featured_image, p_image_alt,
    p_meta_description, p_meta_title, p_keywords, p_tags,
    p_published, p_reading_time, p_reading_time, p_faq,
    v_now, v_now
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    author = EXCLUDED.author,
    featured_image = EXCLUDED.featured_image,
    image_alt = EXCLUDED.image_alt,
    meta_description = EXCLUDED.meta_description,
    meta_title = EXCLUDED.meta_title,
    keywords = EXCLUDED.keywords,
    tags = EXCLUDED.tags,
    published = EXCLUDED.published,
    reading_time = EXCLUDED.reading_time,
    read_time = EXCLUDED.read_time,
    faq = EXCLUDED.faq,
    updated_at = v_now
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_blog_post TO authenticated;

-- ============================================================================
-- 6. VÉRIFIER LES INDEX
-- ============================================================================

-- Index sur featured_image
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured_image
ON blog_posts(featured_image)
WHERE featured_image IS NOT NULL;

-- Index sur faq_entries order_index
CREATE INDEX IF NOT EXISTS idx_faq_entries_order
ON faq_entries(order_index);

-- Index sur faq_entries category
CREATE INDEX IF NOT EXISTS idx_faq_entries_category
ON faq_entries(category);

-- ============================================================================
-- RÉSUMÉ
-- ============================================================================

DO $$
DECLARE
  v_has_featured_image boolean;
  v_has_image_alt boolean;
  v_has_order_index boolean;
BEGIN
  -- Vérifier les colonnes
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'featured_image'
  ) INTO v_has_featured_image;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'image_alt'
  ) INTO v_has_image_alt;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq_entries' AND column_name = 'order_index'
  ) INTO v_has_order_index;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 20251015140000 appliquée avec succès';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 CORRECTIONS APPLIQUÉES:';
  RAISE NOTICE '   ✅ Fonctions get_blog_posts() recréées proprement';
  RAISE NOTICE '   ✅ Fonctions get_faq_entries() recréées';
  RAISE NOTICE '   ✅ Fonction upsert_blog_post() créée';
  RAISE NOTICE '';
  RAISE NOTICE '📊 VÉRIFICATION COLONNES:';
  RAISE NOTICE '   • blog_posts.featured_image: %', CASE WHEN v_has_featured_image THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   • blog_posts.image_alt: %', CASE WHEN v_has_image_alt THEN '✅' ELSE '❌' END;
  RAISE NOTICE '   • faq_entries.order_index: %', CASE WHEN v_has_order_index THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Toutes les fonctions sont maintenant cohérentes avec le schéma';
  RAISE NOTICE '';
END $$;
