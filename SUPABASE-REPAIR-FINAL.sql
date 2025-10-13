/*
  # RÉPARATION FINALE - Tables Blog & FAQ

  Ajoute TOUTES les colonnes manquantes sans détruire les données
  Version ultra-sécurisée avec vérifications

  À exécuter dans: Supabase Dashboard > SQL Editor
*/

-- ========================================
-- ÉTAPE 1: Ajouter contraintes UNIQUE (CRITIQUE)
-- ========================================

-- blog_posts: slug UNIQUE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_slug_key'
  ) THEN
    ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);
    RAISE NOTICE '✅ Contrainte UNIQUE ajoutée sur blog_posts.slug';
  END IF;
END $$;

-- faq_entries: question UNIQUE (CRITIQUE pour ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'faq_entries_question_key'
  ) THEN
    ALTER TABLE faq_entries ADD CONSTRAINT faq_entries_question_key UNIQUE (question);
    RAISE NOTICE '✅ Contrainte UNIQUE ajoutée sur faq_entries.question';
  END IF;
END $$;

-- ========================================
-- ÉTAPE 2: Ajouter colonnes manquantes à blog_posts
-- ========================================

-- Colonne published
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'published'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN published boolean DEFAULT true;
    UPDATE blog_posts SET published = true WHERE published IS NULL;
    RAISE NOTICE '✅ Colonne published ajoutée à blog_posts';
  END IF;
END $$;

-- Colonne faq
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'faq'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN faq jsonb DEFAULT '[]'::jsonb;
    RAISE NOTICE '✅ Colonne faq ajoutée à blog_posts';
  END IF;
END $$;

-- Colonne tags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'tags'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN tags text[] DEFAULT '{}';
    RAISE NOTICE '✅ Colonne tags ajoutée à blog_posts';
  END IF;
END $$;

-- ========================================
-- ÉTAPE 3: Ajouter colonnes manquantes à faq_entries
-- ========================================

-- Colonne published
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq_entries' AND column_name = 'published'
  ) THEN
    ALTER TABLE faq_entries ADD COLUMN published boolean DEFAULT true;
    UPDATE faq_entries SET published = true WHERE published IS NULL;
    RAISE NOTICE '✅ Colonne published ajoutée à faq_entries';
  END IF;
END $$;

-- Colonne priority
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq_entries' AND column_name = 'priority'
  ) THEN
    ALTER TABLE faq_entries ADD COLUMN priority integer DEFAULT 0;
    RAISE NOTICE '✅ Colonne priority ajoutée à faq_entries';
  END IF;
END $$;

-- Colonne category
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq_entries' AND column_name = 'category'
  ) THEN
    ALTER TABLE faq_entries ADD COLUMN category text DEFAULT 'general';
    RAISE NOTICE '✅ Colonne category ajoutée à faq_entries';
  END IF;
END $$;

-- Colonne source_blog_slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq_entries' AND column_name = 'source_blog_slug'
  ) THEN
    ALTER TABLE faq_entries ADD COLUMN source_blog_slug text;
    -- Ajouter la foreign key APRÈS avoir ajouté la colonne
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_posts') THEN
      ALTER TABLE faq_entries ADD CONSTRAINT faq_entries_source_blog_slug_fkey
        FOREIGN KEY (source_blog_slug) REFERENCES blog_posts(slug) ON DELETE SET NULL;
    END IF;
    RAISE NOTICE '✅ Colonne source_blog_slug ajoutée à faq_entries';
  END IF;
END $$;

-- ========================================
-- ÉTAPE 4: Créer index SEULEMENT s'ils n'existent pas
-- ========================================

-- Index blog_posts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_blog_posts_slug') THEN
    CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_blog_posts_published') THEN
    CREATE INDEX idx_blog_posts_published ON blog_posts(published);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_blog_posts_created_at') THEN
    CREATE INDEX idx_blog_posts_created_at ON blog_posts(created_at DESC);
  END IF;
END $$;

-- Index faq_entries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_faq_category') THEN
    CREATE INDEX idx_faq_category ON faq_entries(category);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_faq_priority') THEN
    CREATE INDEX idx_faq_priority ON faq_entries(priority DESC);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_faq_published') THEN
    CREATE INDEX idx_faq_published ON faq_entries(published);
  END IF;
END $$;

-- ========================================
-- ÉTAPE 5: Supprimer anciens triggers et fonctions
-- ========================================

-- Supprimer TOUS les triggers sur blog_posts
DROP TRIGGER IF EXISTS trigger_extract_faq ON blog_posts;
DROP TRIGGER IF EXISTS update_blog_posts_updated_at_trigger ON blog_posts;
DROP TRIGGER IF EXISTS set_timestamp ON blog_posts;

-- Supprimer TOUTES les fonctions obsolètes
DROP FUNCTION IF EXISTS get_blog_posts() CASCADE;
DROP FUNCTION IF EXISTS get_blog_post_by_slug(text) CASCADE;
DROP FUNCTION IF EXISTS upsert_blog_post CASCADE;
DROP FUNCTION IF EXISTS extract_faq_from_blog() CASCADE;
DROP FUNCTION IF EXISTS get_faq_entries(text) CASCADE;
DROP FUNCTION IF EXISTS update_blog_posts_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_timestamp() CASCADE;

-- ========================================
-- ÉTAPE 6: Créer fonctions SQL
-- ========================================

-- Fonction GET BLOG POSTS
CREATE FUNCTION get_blog_posts()
RETURNS TABLE (
  slug text,
  title text,
  excerpt text,
  content text,
  tags text[],
  faq jsonb,
  published boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    blog_posts.slug,
    blog_posts.title,
    blog_posts.excerpt,
    blog_posts.content,
    COALESCE(blog_posts.tags, '{}'),
    COALESCE(blog_posts.faq, '[]'::jsonb),
    COALESCE(blog_posts.published, true),
    blog_posts.created_at,
    blog_posts.updated_at
  FROM blog_posts
  WHERE COALESCE(blog_posts.published, true) = true
  ORDER BY blog_posts.created_at DESC;
END;
$$;

-- Fonction GET BLOG POST BY SLUG
CREATE FUNCTION get_blog_post_by_slug(p_slug text)
RETURNS TABLE (
  slug text,
  title text,
  excerpt text,
  content text,
  tags text[],
  faq jsonb,
  published boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    blog_posts.slug,
    blog_posts.title,
    blog_posts.excerpt,
    blog_posts.content,
    COALESCE(blog_posts.tags, '{}'),
    COALESCE(blog_posts.faq, '[]'::jsonb),
    COALESCE(blog_posts.published, true),
    blog_posts.created_at,
    blog_posts.updated_at
  FROM blog_posts
  WHERE blog_posts.slug = p_slug
  AND COALESCE(blog_posts.published, true) = true
  LIMIT 1;
END;
$$;

-- Fonction UPSERT BLOG POST
CREATE FUNCTION upsert_blog_post(
  p_slug text,
  p_title text,
  p_excerpt text,
  p_content text,
  p_tags text[] DEFAULT '{}',
  p_faq jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  INSERT INTO blog_posts (slug, title, excerpt, content, tags, faq, published, created_at, updated_at)
  VALUES (p_slug, p_title, p_excerpt, p_content, p_tags, p_faq, true, now(), now())
  ON CONFLICT (slug)
  DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    tags = EXCLUDED.tags,
    faq = EXCLUDED.faq,
    published = EXCLUDED.published,
    updated_at = now()
  RETURNING jsonb_build_object(
    'slug', slug,
    'title', title,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Fonction EXTRACT FAQ
CREATE FUNCTION extract_faq_from_blog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  faq_item jsonb;
BEGIN
  IF NEW.faq IS NOT NULL AND jsonb_array_length(NEW.faq) > 0 THEN
    FOR faq_item IN SELECT * FROM jsonb_array_elements(NEW.faq)
    LOOP
      INSERT INTO faq_entries (question, answer, category, source_blog_slug, published)
      VALUES (
        faq_item->>'question',
        faq_item->>'answer',
        COALESCE(faq_item->>'category', 'assurance-taxi'),
        NEW.slug,
        true
      )
      ON CONFLICT (question)
      DO UPDATE SET
        answer = EXCLUDED.answer,
        category = EXCLUDED.category,
        updated_at = now();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Fonction GET FAQ
CREATE FUNCTION get_faq_entries(p_category text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  priority integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    faq_entries.id,
    faq_entries.question,
    faq_entries.answer,
    COALESCE(faq_entries.category, 'general'),
    COALESCE(faq_entries.priority, 0),
    faq_entries.created_at
  FROM faq_entries
  WHERE COALESCE(faq_entries.published, true) = true
  AND (p_category IS NULL OR faq_entries.category = p_category)
  ORDER BY COALESCE(faq_entries.priority, 0) DESC, faq_entries.created_at DESC;
END;
$$;

-- ========================================
-- ÉTAPE 7: Créer trigger
-- ========================================

DROP TRIGGER IF EXISTS trigger_extract_faq ON blog_posts;

CREATE TRIGGER trigger_extract_faq
  AFTER INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  WHEN (COALESCE(NEW.published, true) = true AND NEW.faq IS NOT NULL)
  EXECUTE FUNCTION extract_faq_from_blog();

-- ========================================
-- ÉTAPE 8: Insérer articles de test
-- ========================================

SELECT upsert_blog_post(
  'assurance-taxi-guide-complet-2025',
  'Guide Complet Assurance Taxi 2025',
  'Découvrez tout ce qu''il faut savoir sur l''assurance taxi en 2025 : tarifs, garanties, obligations légales.',
  '<h2>Introduction</h2><p>L''assurance taxi est une obligation légale pour tous les chauffeurs de taxi en France. Ce guide complet vous explique tout ce que vous devez savoir.</p><h2>Les Garanties Obligatoires</h2><p>La RC Pro est obligatoire pour couvrir les passagers transportés.</p><h2>Les Tarifs</h2><p>Les tarifs varient selon votre expérience, votre véhicule et votre localisation.</p>',
  ARRAY['assurance', 'taxi', '2025', 'guide'],
  '[
    {"question": "Quelle assurance pour un taxi ?", "answer": "Un taxi doit souscrire une assurance responsabilité civile professionnelle obligatoire couvrant les passagers transportés.", "category": "assurance-taxi"},
    {"question": "Quel est le prix d''une assurance taxi ?", "answer": "Le prix varie entre 1500€ et 3500€ par an selon le véhicule, l''expérience du chauffeur et la localisation.", "category": "tarifs"}
  ]'::jsonb
);

SELECT upsert_blog_post(
  'devenir-chauffeur-taxi-2025',
  'Comment Devenir Chauffeur de Taxi en 2025',
  'Les étapes complètes pour devenir chauffeur de taxi : formation, examen, licence et assurance obligatoire.',
  '<h2>Les Étapes pour Devenir Taxi</h2><p>Pour devenir chauffeur de taxi en France, vous devez suivre plusieurs étapes obligatoires.</p><h2>La Formation</h2><p>La formation taxi dure environ 250 heures et coûte entre 400€ et 600€.</p><h2>L''Examen</h2><p>Un examen national valide vos connaissances.</p>',
  ARRAY['formation', 'taxi', 'carrière', '2025'],
  '[
    {"question": "Combien coûte la formation taxi ?", "answer": "La formation taxi coûte entre 400€ et 600€ selon les centres de formation agréés.", "category": "formation"},
    {"question": "Quelle est la durée de formation taxi ?", "answer": "La formation dure environ 250 heures réparties sur 3 à 4 mois.", "category": "formation"}
  ]'::jsonb
);

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================

SELECT '✅ Structure blog_posts:' as info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'blog_posts' ORDER BY ordinal_position;

SELECT '✅ Structure faq_entries:' as info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'faq_entries' ORDER BY ordinal_position;

SELECT '✅ Articles créés:' as info, COUNT(*) as count FROM blog_posts;
SELECT '✅ FAQ extraites:' as info, COUNT(*) as count FROM faq_entries;

SELECT '📝 Test get_blog_posts():' as test;
SELECT slug, title FROM get_blog_posts();

SELECT '❓ Test get_faq_entries():' as test;
SELECT question, category FROM get_faq_entries();

-- ========================================
-- ✅ TERMINÉ !
-- ========================================

/*
  RÉSULTAT ATTENDU:

  ✅ Structure blog_posts: colonnes listées
  ✅ Structure faq_entries: colonnes listées
  ✅ Articles créés: 2
  ✅ FAQ extraites: 4
  📝 2 articles affichés
  ❓ 4 FAQ affichées

  Si tu vois tout ça → PARFAIT ! 🎉
*/
