/*
  # Fix Blog Slugs + Anti-Doublon System

  Cette migration:
  1. Nettoie les slugs existants (enlève les suffixes -XX)
  2. Supprime les articles en doublon
  3. Ajoute une contrainte UNIQUE sur le slug
  4. Crée un système de verrou pour éviter génération simultanée
*/

-- 1. Créer table de verrous pour éviter génération simultanée
CREATE TABLE IF NOT EXISTS generation_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_type text NOT NULL, -- 'blog', 'city_page', 'faq'
  locked_at timestamptz DEFAULT now(),
  locked_by text, -- Nom du cron job ou utilisateur
  expires_at timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_generation_locks_type ON generation_locks(lock_type);
CREATE INDEX IF NOT EXISTS idx_generation_locks_expires ON generation_locks(expires_at);

-- RLS: Lecture publique, écriture authentifiée
ALTER TABLE generation_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow anon read locks"
  ON generation_locks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated manage locks"
  ON generation_locks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Fonction pour acquérir un verrou (retourne true si succès)
CREATE OR REPLACE FUNCTION acquire_generation_lock(
  p_lock_type text,
  p_locked_by text DEFAULT 'system',
  p_duration_minutes integer DEFAULT 5
) RETURNS boolean AS $$
DECLARE
  v_lock_exists boolean;
BEGIN
  -- Nettoyer les verrous expirés
  DELETE FROM generation_locks WHERE expires_at < NOW();

  -- Vérifier si un verrou actif existe déjà
  SELECT EXISTS(
    SELECT 1 FROM generation_locks
    WHERE lock_type = p_lock_type
    AND expires_at > NOW()
  ) INTO v_lock_exists;

  -- Si verrou existe déjà, échec
  IF v_lock_exists THEN
    RETURN false;
  END IF;

  -- Créer le nouveau verrou
  INSERT INTO generation_locks (lock_type, locked_by, expires_at)
  VALUES (
    p_lock_type,
    p_locked_by,
    NOW() + (p_duration_minutes || ' minutes')::interval
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction pour libérer un verrou
CREATE OR REPLACE FUNCTION release_generation_lock(p_lock_type text)
RETURNS void AS $$
BEGIN
  DELETE FROM generation_locks WHERE lock_type = p_lock_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Nettoyer les slugs existants (enlever suffixes -XX)
UPDATE blog_posts
SET slug = REGEXP_REPLACE(slug, '-\d+$', '')
WHERE slug ~ '-\d+$';

-- 5. Identifier et supprimer les doublons (garder le plus récent)
DELETE FROM blog_posts
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(TRIM(title))
             ORDER BY created_at DESC
           ) as rn
    FROM blog_posts
  ) t
  WHERE t.rn > 1
);

-- 6. Ajouter contrainte UNIQUE sur slug (si pas déjà présente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'blog_posts_slug_unique'
  ) THEN
    ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_slug_unique UNIQUE (slug);
    RAISE NOTICE 'Contrainte UNIQUE ajoutée sur blog_posts.slug';
  ELSE
    RAISE NOTICE 'Contrainte UNIQUE existe déjà sur blog_posts.slug';
  END IF;
END $$;

-- 7. Fonction améliorée pour insérer article (vérifie doublon)
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
BEGIN
  -- Vérifier si article existe déjà (par slug OU titre similaire)
  SELECT EXISTS(
    SELECT 1 FROM blog_posts
    WHERE slug = p_slug
    OR LOWER(TRIM(title)) = LOWER(TRIM(p_title))
  ) INTO v_exists;

  -- Si existe déjà, retourner l'ID existant
  IF v_exists THEN
    SELECT id INTO v_post_id FROM blog_posts
    WHERE slug = p_slug
    OR LOWER(TRIM(title)) = LOWER(TRIM(p_title))
    LIMIT 1;

    RAISE NOTICE 'Article existe déjà: %', p_title;
    RETURN v_post_id;
  END IF;

  -- Sinon, insérer nouvel article
  INSERT INTO blog_posts (
    slug, title, excerpt, content, author, featured_image, tags, published
  ) VALUES (
    p_slug, p_title, p_excerpt, p_content, p_author, p_featured_image, p_tags, true
  ) RETURNING id INTO v_post_id;

  RAISE NOTICE 'Nouvel article créé: %', p_title;
  RETURN v_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Afficher résultat
DO $$
DECLARE
  v_blog_count INT;
  v_duplicates_removed INT;
BEGIN
  SELECT COUNT(*) INTO v_blog_count FROM blog_posts;

  RAISE NOTICE '✅ Migration terminée !';
  RAISE NOTICE '📝 Articles blog uniques: %', v_blog_count;
  RAISE NOTICE '🔒 Système anti-doublon activé';
  RAISE NOTICE '⚡ Verrou génération installé';
END $$;
