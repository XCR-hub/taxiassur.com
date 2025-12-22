/*
  # Configuration Simple Supabase - Blog & FAQ Automatique

  Version simplifiée sans DROP pour éviter la perte de données
  Ajoute les éléments manquants sans détruire l'existant

  À exécuter dans: Supabase Dashboard > SQL Editor
  Instance: drohhxrkoequjphvabvq.supabase.co
*/

-- ========================================
-- ÉTAPE 1: Ajouter colonne FAQ si manquante
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'faq'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN faq jsonb DEFAULT '[]'::jsonb;
    RAISE NOTICE '✅ Colonne faq ajoutée à blog_posts';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne faq existe déjà dans blog_posts';
  END IF;
END $$;

-- ========================================
-- ÉTAPE 2: Ajouter colonne priority à FAQ
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq_entries' AND column_name = 'priority'
  ) THEN
    ALTER TABLE faq_entries ADD COLUMN priority integer DEFAULT 0;
    RAISE NOTICE '✅ Colonne priority ajoutée à faq_entries';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne priority existe déjà dans faq_entries';
  END IF;
END $$;

-- ========================================
-- ÉTAPE 3: Créer les index manquants
-- ========================================

-- Index blog_posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- Index faq_entries
CREATE INDEX IF NOT EXISTS idx_faq_category ON faq_entries(category);
CREATE INDEX IF NOT EXISTS idx_faq_priority ON faq_entries(priority DESC);
CREATE INDEX IF NOT EXISTS idx_faq_published ON faq_entries(published);

-- ========================================
-- ÉTAPE 4: Supprimer anciennes fonctions
-- ========================================

DROP FUNCTION IF EXISTS get_blog_posts() CASCADE;
DROP FUNCTION IF EXISTS get_blog_post_by_slug(text) CASCADE;
DROP FUNCTION IF EXISTS upsert_blog_post CASCADE;
DROP FUNCTION IF EXISTS extract_faq_from_blog() CASCADE;
DROP FUNCTION IF EXISTS get_faq_entries(text) CASCADE;

-- ========================================
-- ÉTAPE 5: Créer fonction GET BLOG POSTS
-- ========================================

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
    blog_posts.tags,
    blog_posts.faq,
    blog_posts.published,
    blog_posts.created_at,
    blog_posts.updated_at
  FROM blog_posts
  WHERE blog_posts.published = true
  ORDER BY blog_posts.created_at DESC;
END;
$$;

-- ========================================
-- ÉTAPE 6: Créer fonction GET BLOG POST BY SLUG
-- ========================================

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
    blog_posts.tags,
    blog_posts.faq,
    blog_posts.published,
    blog_posts.created_at,
    blog_posts.updated_at
  FROM blog_posts
  WHERE blog_posts.slug = p_slug
  AND blog_posts.published = true
  LIMIT 1;
END;
$$;

-- ========================================
-- ÉTAPE 7: Créer fonction UPSERT BLOG POST
-- ========================================

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

-- ========================================
-- ÉTAPE 8: Créer fonction EXTRACT FAQ
-- ========================================

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
        updated_at = now();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ========================================
-- ÉTAPE 9: Créer trigger automatique
-- ========================================

DROP TRIGGER IF EXISTS trigger_extract_faq ON blog_posts;

CREATE TRIGGER trigger_extract_faq
  AFTER INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  WHEN (NEW.published = true AND NEW.faq IS NOT NULL)
  EXECUTE FUNCTION extract_faq_from_blog();

-- ========================================
-- ÉTAPE 10: Créer fonction GET FAQ
-- ========================================

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
    faq_entries.category,
    faq_entries.priority,
    faq_entries.created_at
  FROM faq_entries
  WHERE faq_entries.published = true
  AND (p_category IS NULL OR faq_entries.category = p_category)
  ORDER BY faq_entries.priority DESC, faq_entries.created_at DESC;
END;
$$;

-- ========================================
-- ÉTAPE 11: Insérer 2 articles de test
-- ========================================

SELECT upsert_blog_post(
  'assurance-taxi-guide-complet-2025',
  'Guide Complet Assurance Taxi 2025',
  'Découvrez tout ce qu''il faut savoir sur l''assurance taxi en 2025 : tarifs, garanties, obligations légales.',
  '<h2>Introduction</h2><p>L''assurance taxi est une obligation légale pour tous les chauffeurs de taxi en France. Ce guide complet vous explique tout ce que vous devez savoir.</p><h2>Les Garanties Obligatoires</h2><p>La RC Pro est obligatoire pour couvrir les passagers transportés.</p>',
  ARRAY['assurance', 'taxi', '2025'],
  '[
    {"question": "Quelle assurance pour un taxi ?", "answer": "Un taxi doit souscrire une assurance responsabilité civile professionnelle obligatoire couvrant les passagers transportés.", "category": "assurance-taxi"},
    {"question": "Quel est le prix d''une assurance taxi ?", "answer": "Le prix varie entre 1500€ et 3500€ par an selon le véhicule, l''expérience du chauffeur et la localisation.", "category": "tarifs"}
  ]'::jsonb
);

SELECT upsert_blog_post(
  'devenir-chauffeur-taxi-2025',
  'Comment Devenir Chauffeur de Taxi en 2025',
  'Les étapes complètes pour devenir chauffeur de taxi : formation, examen, licence et assurance obligatoire.',
  '<h2>Les Étapes pour Devenir Taxi</h2><p>Pour devenir chauffeur de taxi en France, vous devez suivre plusieurs étapes obligatoires.</p><h2>La Formation</h2><p>La formation taxi dure environ 250 heures et coûte entre 400€ et 600€.</p>',
  ARRAY['formation', 'taxi', 'carrière'],
  '[
    {"question": "Combien coûte la formation taxi ?", "answer": "La formation taxi coûte entre 400€ et 600€ selon les centres de formation agréés.", "category": "formation"},
    {"question": "Quelle est la durée de formation taxi ?", "answer": "La formation dure environ 250 heures réparties sur 3 à 4 mois.", "category": "formation"}
  ]'::jsonb
);

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================

SELECT '✅ Articles créés:' as info, COUNT(*) as count FROM blog_posts;
SELECT '✅ FAQ extraites:' as info, COUNT(*) as count FROM faq_entries;

-- Test des fonctions
SELECT '📝 Test get_blog_posts():' as test;
SELECT slug, title FROM get_blog_posts();

SELECT '❓ Test get_faq_entries():' as test;
SELECT question, category FROM get_faq_entries();

-- ========================================
-- ✅ TERMINÉ !
-- ========================================

/*
  RÉSULTAT ATTENDU:

  ✅ Articles créés: 2
  ✅ FAQ extraites: 4
  📝 Test get_blog_posts(): 2 lignes
  ❓ Test get_faq_entries(): 4 lignes

  Si tu vois ça, c'est parfait ! 🎉
*/
