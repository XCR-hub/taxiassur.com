/*
  # Fix Duplicate Slug Error + Anti-Doublon System

  Cette migration corrige l'erreur:
  ERROR: duplicate key value violates unique constraint "blog_posts_slug_key"

  Actions:
  1. Supprime la contrainte UNIQUE existante qui bloque
  2. Nettoie les slugs en doublon en ajoutant suffixe -2, -3, etc.
  3. Recrée contrainte UNIQUE propre
  4. Ajoute système de verrous anti-doublon
*/

-- ÉTAPE 1: Supprimer contrainte UNIQUE existante
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_slug_key'
  ) THEN
    ALTER TABLE blog_posts DROP CONSTRAINT blog_posts_slug_key;
    RAISE NOTICE '✅ Ancienne contrainte blog_posts_slug_key supprimée';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_slug_unique'
  ) THEN
    ALTER TABLE blog_posts DROP CONSTRAINT blog_posts_slug_unique;
    RAISE NOTICE '✅ Ancienne contrainte blog_posts_slug_unique supprimée';
  END IF;
END $$;

-- ÉTAPE 2: Nettoyer slugs en doublon (ajouter suffixe -2, -3, etc.)
DO $$
DECLARE
  r RECORD;
  v_counter INT;
  v_new_slug TEXT;
BEGIN
  FOR r IN (
    SELECT slug, COUNT(*) as cnt
    FROM blog_posts
    GROUP BY slug
    HAVING COUNT(*) > 1
  )
  LOOP
    v_counter := 2;

    -- Pour chaque doublon sauf le premier
    FOR r IN (
      SELECT id, slug
      FROM blog_posts
      WHERE slug = r.slug
      ORDER BY created_at ASC
      OFFSET 1
    )
    LOOP
      v_new_slug := r.slug || '-' || v_counter;

      -- Vérifier que le nouveau slug n'existe pas déjà
      WHILE EXISTS (SELECT 1 FROM blog_posts WHERE slug = v_new_slug) LOOP
        v_counter := v_counter + 1;
        v_new_slug := r.slug || '-' || v_counter;
      END LOOP;

      UPDATE blog_posts SET slug = v_new_slug WHERE id = r.id;
      RAISE NOTICE '📝 Slug dupliqué renommé: % → %', r.slug, v_new_slug;

      v_counter := v_counter + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ Tous les doublons ont été renommés';
END $$;

-- ÉTAPE 3: Recréer contrainte UNIQUE propre
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_slug_unique UNIQUE (slug);

-- ÉTAPE 4: Créer table de verrous si n'existe pas
CREATE TABLE IF NOT EXISTS generation_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_type text NOT NULL,
  locked_at timestamptz DEFAULT now(),
  locked_by text,
  expires_at timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_generation_locks_type ON generation_locks(lock_type);
CREATE INDEX IF NOT EXISTS idx_generation_locks_expires ON generation_locks(expires_at);

-- RLS
ALTER TABLE generation_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read locks" ON generation_locks;
DROP POLICY IF EXISTS "Allow authenticated manage locks" ON generation_locks;

CREATE POLICY "Allow anon read locks"
  ON generation_locks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated manage locks"
  ON generation_locks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ÉTAPE 5: Fonctions anti-doublon
CREATE OR REPLACE FUNCTION acquire_generation_lock(
  p_lock_type text,
  p_locked_by text DEFAULT 'system',
  p_duration_minutes integer DEFAULT 5
) RETURNS boolean AS $$
DECLARE
  v_lock_exists boolean;
BEGIN
  DELETE FROM generation_locks WHERE expires_at < NOW();

  SELECT EXISTS(
    SELECT 1 FROM generation_locks
    WHERE lock_type = p_lock_type AND expires_at > NOW()
  ) INTO v_lock_exists;

  IF v_lock_exists THEN
    RETURN false;
  END IF;

  INSERT INTO generation_locks (lock_type, locked_by, expires_at)
  VALUES (p_lock_type, p_locked_by, NOW() + (p_duration_minutes || ' minutes')::interval);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION release_generation_lock(p_lock_type text)
RETURNS void AS $$
BEGIN
  DELETE FROM generation_locks WHERE lock_type = p_lock_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 6: Fonction upsert intelligente
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

-- ÉTAPE 7: Résumé
DO $$
DECLARE
  v_blog_count INT;
  v_duplicate_count INT;
BEGIN
  SELECT COUNT(*) INTO v_blog_count FROM blog_posts;
  SELECT COUNT(*) INTO v_duplicate_count FROM blog_posts WHERE slug ~ '-\d+$';

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION TERMINÉE AVEC SUCCÈS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTIQUES:';
  RAISE NOTICE '  • Articles total: %', v_blog_count;
  RAISE NOTICE '  • Articles avec suffixe: %', v_duplicate_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SÉCURITÉ ACTIVÉE:';
  RAISE NOTICE '  • Contrainte UNIQUE sur slug: ✅';
  RAISE NOTICE '  • Système de verrous: ✅';
  RAISE NOTICE '  • Fonction upsert intelligente: ✅';
  RAISE NOTICE '  • Protection anti-doublon: ✅';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
