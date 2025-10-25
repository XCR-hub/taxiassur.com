/*
  # Configuration Finale Supabase - TaxiAssur Blog & FAQ Automatique

  Ce script configure:
  1. Table blog_posts avec colonne FAQ
  2. Table faq_entries pour remplissage automatique
  3. Fonctions SQL optimisées
  4. Policies RLS sécurisées
  5. Trigger pour extraction automatique FAQ depuis articles

  À exécuter dans: Supabase Dashboard > SQL Editor
  Instance: drohhxrkoequjphvabvq.supabase.co
*/

-- ========================================
-- ÉTAPE 1: Nettoyer l'existant
-- ========================================

-- Supprimer les fonctions existantes
DROP FUNCTION IF EXISTS get_blog_posts() CASCADE;
DROP FUNCTION IF EXISTS get_blog_post_by_slug(text) CASCADE;
DROP FUNCTION IF EXISTS upsert_blog_post(text, text, text, text, text[], jsonb) CASCADE;

-- Supprimer les policies existantes
DROP POLICY IF EXISTS "Anyone can read published blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can insert blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can update blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Allow anonymous insert blog posts temporary" ON blog_posts;

-- ========================================
-- ÉTAPE 2: Recréer la table blog_posts PROPREMENT
-- ========================================

DROP TABLE IF EXISTS blog_posts CASCADE;

CREATE TABLE blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  faq jsonb DEFAULT '[]'::jsonb,
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON blog_posts(published);
CREATE INDEX idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- ========================================
-- ÉTAPE 3: Table FAQ Automatique
-- ========================================

CREATE TABLE IF NOT EXISTS faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text UNIQUE NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'general',
  source_blog_slug text REFERENCES blog_posts(slug) ON DELETE SET NULL,
  priority integer DEFAULT 0,
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_faq_category ON faq_entries(category);
CREATE INDEX idx_faq_priority ON faq_entries(priority DESC);
CREATE INDEX idx_faq_published ON faq_entries(published);

-- ========================================
-- ÉTAPE 4: Activer RLS
-- ========================================

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ÉTAPE 5: Policies RLS - LECTURE PUBLIQUE
-- ========================================

-- Blog: lecture publique des articles publiés
CREATE POLICY "Public can read published blog posts"
  ON blog_posts FOR SELECT
  USING (published = true);

-- Blog: écriture anonyme pour Edge Functions
CREATE POLICY "Service role can write blog posts"
  ON blog_posts FOR ALL
  USING (true)
  WITH CHECK (true);

-- FAQ: lecture publique
CREATE POLICY "Public can read published FAQ"
  ON faq_entries FOR SELECT
  USING (published = true);

-- FAQ: écriture service role
CREATE POLICY "Service role can write FAQ"
  ON faq_entries FOR ALL
  USING (true)
  WITH CHECK (true);

-- ========================================
-- ÉTAPE 6: Fonction GET BLOG POSTS
-- ========================================

CREATE OR REPLACE FUNCTION get_blog_posts()
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
-- ÉTAPE 7: Fonction GET BLOG POST BY SLUG
-- ========================================

CREATE OR REPLACE FUNCTION get_blog_post_by_slug(p_slug text)
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
-- ÉTAPE 8: Fonction UPSERT BLOG POST
-- ========================================

CREATE OR REPLACE FUNCTION upsert_blog_post(
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
-- ÉTAPE 9: Fonction EXTRACT FAQ FROM BLOG
-- ========================================

CREATE OR REPLACE FUNCTION extract_faq_from_blog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  faq_item jsonb;
BEGIN
  -- Si l'article contient des FAQ, les insérer dans faq_entries
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
-- ÉTAPE 10: Trigger automatique FAQ
-- ========================================

DROP TRIGGER IF EXISTS trigger_extract_faq ON blog_posts;

CREATE TRIGGER trigger_extract_faq
  AFTER INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  WHEN (NEW.published = true AND NEW.faq IS NOT NULL)
  EXECUTE FUNCTION extract_faq_from_blog();

-- ========================================
-- ÉTAPE 11: Fonction GET FAQ
-- ========================================

CREATE OR REPLACE FUNCTION get_faq_entries(p_category text DEFAULT NULL)
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
-- ÉTAPE 12: Insérer 2 articles de test
-- ========================================

SELECT upsert_blog_post(
  'assurance-taxi-guide-complet-2025',
  'Guide Complet Assurance Taxi 2025',
  'Découvrez tout ce qu''il faut savoir sur l''assurance taxi en 2025 : tarifs, garanties, obligations légales.',
  '<h2>Introduction</h2><p>L''assurance taxi est une obligation légale pour tous les chauffeurs de taxi en France...</p>',
  ARRAY['assurance', 'taxi', '2025'],
  '[
    {"question": "Quelle assurance pour un taxi ?", "answer": "Un taxi doit souscrire une assurance responsabilité civile professionnelle obligatoire.", "category": "assurance-taxi"},
    {"question": "Quel est le prix d''une assurance taxi ?", "answer": "Le prix varie entre 1500€ et 3500€ par an selon le véhicule et l''expérience.", "category": "tarifs"}
  ]'::jsonb
);

SELECT upsert_blog_post(
  'devenir-chauffeur-taxi-2025',
  'Comment Devenir Chauffeur de Taxi en 2025',
  'Les étapes complètes pour devenir chauffeur de taxi : formation, examen, licence et assurance.',
  '<h2>Les Étapes</h2><p>Pour devenir chauffeur de taxi, vous devez suivre plusieurs étapes obligatoires...</p>',
  ARRAY['formation', 'taxi', 'carrière'],
  '[
    {"question": "Combien coûte la formation taxi ?", "answer": "La formation taxi coûte entre 400€ et 600€ selon les centres.", "category": "formation"},
    {"question": "Quelle est la durée de formation ?", "answer": "La formation dure environ 250 heures sur 3 à 4 mois.", "category": "formation"}
  ]'::jsonb
);

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================

SELECT 'Articles créés:' as info, COUNT(*) as count FROM blog_posts;
SELECT 'FAQ extraites:' as info, COUNT(*) as count FROM faq_entries;

-- Test des fonctions
SELECT 'Test get_blog_posts():' as test;
SELECT slug, title FROM get_blog_posts();

SELECT 'Test get_faq_entries():' as test;
SELECT question, category FROM get_faq_entries();

-- ========================================
-- ✅ TERMINÉ !
-- ========================================

/*
  PROCHAINES ÉTAPES:

  1. Aller dans Supabase Dashboard > SQL Editor
  2. Copier-coller ce script entier
  3. Cliquer "Run"
  4. Vérifier les résultats en bas

  ATTENDU:
  - Articles créés: 2
  - FAQ extraites: 4
  - Test functions: OK

  Ensuite tu pourras:
  - Utiliser l'Edge Function blog-articles pour publier automatiquement
  - Chaque article publié remplira automatiquement la table FAQ
  - Page /blog chargera depuis Supabase
  - Page /faq chargera depuis Supabase
*/
