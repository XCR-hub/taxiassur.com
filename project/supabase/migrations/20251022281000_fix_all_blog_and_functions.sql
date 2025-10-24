/*
  # Fix Complet Blog + Fonctions Manquantes

  Corrige:
  1. Fonction get_blog_post_by_slug manquante
  2. Fonction get_published_blog_posts
  3. RLS blog_posts
  4. Navigation blog cassée

  Résultat: Articles accessibles depuis /blog/:slug
*/

-- Supprimer fonctions existantes si elles existent
DROP FUNCTION IF EXISTS get_blog_post_by_slug(text);
DROP FUNCTION IF EXISTS get_published_blog_posts();
DROP FUNCTION IF EXISTS upsert_blog_post(text, text, text, text, text, text, text[]);

-- Fonction 1: Récupérer article par slug
CREATE OR REPLACE FUNCTION get_blog_post_by_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  excerpt text,
  content text,
  author text,
  featured_image text,
  tags text[],
  published boolean,
  created_at timestamptz,
  updated_at timestamptz,
  faq jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    bp.author,
    bp.featured_image,
    bp.tags,
    bp.published,
    bp.created_at,
    bp.updated_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'question', f.question,
            'answer', f.answer
          )
        )
        FROM faq f
        WHERE f.article_slug = bp.slug
        AND f.published = true
      ),
      '[]'::jsonb
    ) as faq
  FROM blog_posts bp
  WHERE bp.slug = p_slug
  AND bp.published = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction 2: Liste tous les articles publiés
CREATE OR REPLACE FUNCTION get_published_blog_posts()
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  excerpt text,
  content text,
  author text,
  featured_image text,
  tags text[],
  published boolean,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.content,
    bp.author,
    bp.featured_image,
    bp.tags,
    bp.published,
    bp.created_at,
    bp.updated_at
  FROM blog_posts bp
  WHERE bp.published = true
  ORDER BY bp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction 3: Upsert intelligent (évite doublons)
CREATE OR REPLACE FUNCTION upsert_blog_post(
  p_slug text,
  p_title text,
  p_excerpt text,
  p_content text,
  p_author text DEFAULT 'TaxiAssur',
  p_featured_image text DEFAULT NULL,
  p_tags text[] DEFAULT ARRAY[]::text[]
) RETURNS uuid AS $$
DECLARE
  v_post_id uuid;
  v_exists boolean;
  v_final_slug text;
  v_counter int;
BEGIN
  -- Vérifier si article existe par titre (insensible casse)
  SELECT id INTO v_post_id
  FROM blog_posts
  WHERE LOWER(TRIM(title)) = LOWER(TRIM(p_title))
  LIMIT 1;

  IF v_post_id IS NOT NULL THEN
    RAISE NOTICE '⚠️ Article existe déjà (titre): %', p_title;
    RETURN v_post_id;
  END IF;

  -- Vérifier si slug existe
  v_final_slug := p_slug;
  v_counter := 2;

  WHILE EXISTS (SELECT 1 FROM blog_posts WHERE slug = v_final_slug) LOOP
    v_final_slug := p_slug || '-' || v_counter;
    v_counter := v_counter + 1;
  END LOOP;

  IF v_final_slug != p_slug THEN
    RAISE NOTICE '📝 Slug modifié pour unicité: % → %', p_slug, v_final_slug;
  END IF;

  -- Insérer nouvel article avec slug unique
  INSERT INTO blog_posts (
    slug, title, excerpt, content, author, featured_image, tags, published
  ) VALUES (
    v_final_slug, p_title, p_excerpt, p_content, p_author, p_featured_image, p_tags, true
  ) RETURNING id INTO v_post_id;

  RAISE NOTICE '✅ Nouvel article créé: % (slug: %)', p_title, v_final_slug;
  RETURN v_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifier et créer table blog_posts si manquante
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  author text DEFAULT 'TaxiAssur',
  featured_image text,
  tags text[] DEFAULT ARRAY[]::text[],
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created ON blog_posts(created_at DESC);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read blog_posts" ON blog_posts;
DROP POLICY IF EXISTS "Allow public insert blog_posts" ON blog_posts;
DROP POLICY IF EXISTS "Allow authenticated manage blog_posts" ON blog_posts;

CREATE POLICY "Allow public read blog_posts"
  ON blog_posts FOR SELECT
  TO public
  USING (published = true);

CREATE POLICY "Allow public insert blog_posts"
  ON blog_posts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated manage blog_posts"
  ON blog_posts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table FAQ si manquante
CREATE TABLE IF NOT EXISTS faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  article_slug text,
  published boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faq_article_slug ON faq(article_slug);
CREATE INDEX IF NOT EXISTS idx_faq_published ON faq(published);

-- RLS FAQ
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read faq" ON faq;
DROP POLICY IF EXISTS "Allow public insert faq" ON faq;
DROP POLICY IF EXISTS "Allow authenticated manage faq" ON faq;

CREATE POLICY "Allow public read faq"
  ON faq FOR SELECT
  TO public
  USING (published = true);

CREATE POLICY "Allow public insert faq"
  ON faq FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated manage faq"
  ON faq FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Message succès
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ FIX BLOG COMPLET TERMINÉ';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Fonctions créées:';
  RAISE NOTICE '  • get_blog_post_by_slug(slug)';
  RAISE NOTICE '  • get_published_blog_posts()';
  RAISE NOTICE '  • upsert_blog_post(...)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS activé:';
  RAISE NOTICE '  • blog_posts: lecture publique (published=true)';
  RAISE NOTICE '  • faq: lecture publique (published=true)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Navigation blog fonctionne maintenant:';
  RAISE NOTICE '  • /blog → Liste articles';
  RAISE NOTICE '  • /blog/assurance-taxi-2025 → Article';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
