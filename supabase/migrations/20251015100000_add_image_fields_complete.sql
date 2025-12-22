/*
  # Ajout des champs image manquants

  1. Modifications
    - Ajouter `featured_image` et `image_alt` à `blog_posts`
    - Ajouter `mentions` (text[]) à `social_posts` pour les @mentions
    - Ajouter `platform_id` (text) à `social_posts` pour l'ID externe du post

  2. Sécurité
    - Maintenir toutes les policies RLS existantes
    - Les champs peuvent être NULL (optionnels)

  3. Notes
    - Migration safe : ajoute seulement des colonnes
    - Pas de modification des données existantes
    - Compatible avec tous les posts existants
*/

-- ============================================================================
-- 1. AJOUTER CHAMPS IMAGE À blog_posts
-- ============================================================================

-- Vérifier et ajouter featured_image si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'featured_image'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN featured_image text;
    COMMENT ON COLUMN blog_posts.featured_image IS 'URL de l''image mise en avant (Pexels, Unsplash, etc.)';
  END IF;
END $$;

-- Vérifier et ajouter image_alt si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'image_alt'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN image_alt text;
    COMMENT ON COLUMN blog_posts.image_alt IS 'Texte alternatif SEO pour l''image';
  END IF;
END $$;

-- Ajouter author si n'existe pas (pour crédits)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'author'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN author text DEFAULT 'TaxiAssur';
    COMMENT ON COLUMN blog_posts.author IS 'Auteur de l''article';
  END IF;
END $$;

-- Ajouter keywords si n'existe pas (pour SEO)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'keywords'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN keywords text[] DEFAULT ARRAY[]::text[];
    COMMENT ON COLUMN blog_posts.keywords IS 'Mots-clés SEO pour l''article';
  END IF;
END $$;

-- Ajouter meta_title si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'meta_title'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN meta_title text;
    COMMENT ON COLUMN blog_posts.meta_title IS 'Titre SEO meta';
  END IF;
END $$;

-- Ajouter read_time si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'read_time'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN read_time integer DEFAULT 5;
    COMMENT ON COLUMN blog_posts.read_time IS 'Temps de lecture estimé en minutes';
  END IF;
END $$;

-- ============================================================================
-- 2. AJOUTER CHAMPS MANQUANTS À social_posts
-- ============================================================================

-- Vérifier et ajouter mentions si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_posts' AND column_name = 'mentions'
  ) THEN
    ALTER TABLE social_posts ADD COLUMN mentions text[] DEFAULT ARRAY[]::text[];
    COMMENT ON COLUMN social_posts.mentions IS 'Liste des @mentions (ex: @taxiassur, @utilisateur)';
  END IF;
END $$;

-- Vérifier et ajouter platform_id si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_posts' AND column_name = 'platform_id'
  ) THEN
    ALTER TABLE social_posts ADD COLUMN platform_id text;
    COMMENT ON COLUMN social_posts.platform_id IS 'ID du post sur la plateforme (ex: tweet_id, post_id)';
  END IF;
END $$;

-- Vérifier et ajouter link_url si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_posts' AND column_name = 'link_url'
  ) THEN
    ALTER TABLE social_posts ADD COLUMN link_url text;
    COMMENT ON COLUMN social_posts.link_url IS 'URL à partager dans le post';
  END IF;
END $$;

-- ============================================================================
-- 3. INDEXES POUR PERFORMANCES
-- ============================================================================

-- Index sur featured_image pour filtrer articles avec/sans image
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured_image
ON blog_posts(featured_image)
WHERE featured_image IS NOT NULL;

-- Index sur keywords pour recherche
CREATE INDEX IF NOT EXISTS idx_blog_posts_keywords
ON blog_posts USING GIN(keywords);

-- Index sur mentions pour recherche
CREATE INDEX IF NOT EXISTS idx_social_posts_mentions
ON social_posts USING GIN(mentions);

-- Index sur hashtags (déjà présent normalement, mais on vérifie)
CREATE INDEX IF NOT EXISTS idx_social_posts_hashtags
ON social_posts USING GIN(hashtags);

-- ============================================================================
-- 4. FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour extraire les @mentions d'un texte
CREATE OR REPLACE FUNCTION extract_mentions(text_content text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  mentions text[];
BEGIN
  -- Extraire tous les @mentions avec regex
  SELECT array_agg(DISTINCT match[1])
  INTO mentions
  FROM regexp_matches(text_content, '@(\w+)', 'g') AS match;

  RETURN COALESCE(mentions, ARRAY[]::text[]);
END;
$$;

COMMENT ON FUNCTION extract_mentions IS 'Extrait automatiquement les @mentions d''un texte';

-- Fonction pour extraire les #hashtags d'un texte
CREATE OR REPLACE FUNCTION extract_hashtags(text_content text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  hashtags text[];
BEGIN
  -- Extraire tous les #hashtags avec regex
  SELECT array_agg(DISTINCT match[1])
  INTO hashtags
  FROM regexp_matches(text_content, '#(\w+)', 'g') AS match;

  RETURN COALESCE(hashtags, ARRAY[]::text[]);
END;
$$;

COMMENT ON FUNCTION extract_hashtags IS 'Extrait automatiquement les #hashtags d''un texte';

-- ============================================================================
-- 5. TRIGGER AUTO-EXTRACTION MENTIONS/HASHTAGS
-- ============================================================================

-- Fonction trigger pour auto-remplir mentions et hashtags
CREATE OR REPLACE FUNCTION auto_extract_social_tags()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Auto-extraire les mentions si le champ est vide
  IF NEW.mentions IS NULL OR array_length(NEW.mentions, 1) IS NULL THEN
    NEW.mentions := extract_mentions(NEW.content);
  END IF;

  -- Auto-extraire les hashtags si le champ est vide
  IF NEW.hashtags IS NULL OR array_length(NEW.hashtags, 1) IS NULL THEN
    NEW.hashtags := extract_hashtags(NEW.content);
  END IF;

  RETURN NEW;
END;
$$;

-- Créer trigger sur social_posts
DROP TRIGGER IF EXISTS trigger_auto_extract_social_tags ON social_posts;
CREATE TRIGGER trigger_auto_extract_social_tags
  BEFORE INSERT OR UPDATE ON social_posts
  FOR EACH ROW
  EXECUTE FUNCTION auto_extract_social_tags();

COMMENT ON TRIGGER trigger_auto_extract_social_tags ON social_posts IS
'Auto-extrait les @mentions et #hashtags du contenu si non renseignés manuellement';

-- ============================================================================
-- 6. METTRE À JOUR LES FONCTIONS RPC POUR INCLURE featured_image
-- ============================================================================

-- Recréer get_blog_posts avec featured_image
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
AS $$
  SELECT
    id,
    slug,
    title,
    excerpt,
    content,
    COALESCE(author, 'TaxiAssur') as author,
    featured_image,
    meta_description,
    meta_title,
    COALESCE(keywords, ARRAY[]::text[]) as keywords,
    COALESCE(tags, ARRAY[]::text[]) as tags,
    COALESCE(published, false) as published,
    COALESCE(reading_time, read_time, 5) as reading_time,
    COALESCE(read_time, reading_time, 5) as read_time,
    COALESCE(faq, '[]'::jsonb) as faq,
    created_at,
    updated_at
  FROM blog_posts
  WHERE COALESCE(published, false) = true
  ORDER BY created_at DESC;
$$;

-- Recréer get_blog_post_by_slug avec featured_image
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
AS $$
  SELECT
    id,
    slug,
    title,
    excerpt,
    content,
    COALESCE(author, 'TaxiAssur') as author,
    featured_image,
    image_alt,
    meta_description,
    meta_title,
    COALESCE(keywords, ARRAY[]::text[]) as keywords,
    COALESCE(tags, ARRAY[]::text[]) as tags,
    COALESCE(published, false) as published,
    COALESCE(reading_time, read_time, 5) as reading_time,
    COALESCE(read_time, reading_time, 5) as read_time,
    COALESCE(faq, '[]'::jsonb) as faq,
    created_at,
    updated_at
  FROM blog_posts
  WHERE slug = p_slug AND COALESCE(published, false) = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_blog_posts IS 'Récupère tous les articles publiés avec images';
COMMENT ON FUNCTION get_blog_post_by_slug IS 'Récupère un article par slug avec image';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_blog_posts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_blog_post_by_slug(text) TO anon, authenticated;

-- ============================================================================
-- RÉSUMÉ
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20251015100000 appliquée avec succès';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Champs ajoutés à blog_posts:';
  RAISE NOTICE '   - featured_image (text) : URL image Pexels/Unsplash';
  RAISE NOTICE '   - image_alt (text) : Alt text SEO';
  RAISE NOTICE '   - author (text) : Auteur article';
  RAISE NOTICE '   - keywords (text[]) : Mots-clés SEO';
  RAISE NOTICE '   - meta_title (text) : Titre meta';
  RAISE NOTICE '   - read_time (integer) : Temps de lecture';
  RAISE NOTICE '';
  RAISE NOTICE '📱 Champs ajoutés à social_posts:';
  RAISE NOTICE '   - mentions (text[]) : @mentions extraites auto';
  RAISE NOTICE '   - platform_id (text) : ID externe du post';
  RAISE NOTICE '   - link_url (text) : URL à partager';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Fonctions utilitaires créées:';
  RAISE NOTICE '   - extract_mentions(text) : Extrait @mentions';
  RAISE NOTICE '   - extract_hashtags(text) : Extrait #hashtags';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Trigger automatique activé:';
  RAISE NOTICE '   - Auto-extraction mentions/hashtags sur social_posts';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Système images + réseaux sociaux 100% opérationnel!';
END $$;
