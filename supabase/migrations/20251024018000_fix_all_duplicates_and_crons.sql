/*
  # Fix complet : Crons + Doublons + Images

  1. Désactive/supprime les crons en doublon
  2. Garde UN SEUL cron blog (1x/jour)
  3. Ajoute contraintes pour éviter les doublons
  4. Fix images Pexels (pas de réutilisation)
*/

-- =====================================================
-- PARTIE 1 : FIX CRONS BLOG
-- =====================================================

-- Désactiver tous les crons blog existants
UPDATE cron.job
SET active = false
WHERE jobname IN ('generate_daily_blog_post', 'generate_blog_daily', 'test_blog_now');

-- Supprimer tous les crons blog
SELECT cron.unschedule('generate_daily_blog_post') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate_daily_blog_post'
);

SELECT cron.unschedule('generate_blog_daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate_blog_daily'
);

SELECT cron.unschedule('test_blog_now') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'test_blog_now'
);

-- Recréer UN SEUL cron blog (1x/jour à 10h)
SELECT cron.schedule(
  'generate_daily_blog_post',
  '0 10 * * *',
  $$SELECT generate_daily_blog_post();$$
);

-- =====================================================
-- PARTIE 2 : CONTRAINTES ANTI-DOUBLONS BLOG
-- =====================================================

-- Ajouter contrainte unique sur slug (si pas déjà existante)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'blog_posts_slug_unique'
  ) THEN
    ALTER TABLE blog_posts
    ADD CONSTRAINT blog_posts_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- =====================================================
-- PARTIE 3 : CONTRAINTES ANTI-DOUBLONS CITY PAGES
-- =====================================================

-- Ajouter contrainte unique sur slug city_pages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'city_pages_slug_unique'
  ) THEN
    ALTER TABLE city_pages
    ADD CONSTRAINT city_pages_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- =====================================================
-- PARTIE 4 : TABLE TRACKING IMAGES PEXELS
-- =====================================================

-- Créer table pour tracker les images utilisées
CREATE TABLE IF NOT EXISTS pexels_images_used (
  id BIGSERIAL PRIMARY KEY,
  pexels_id TEXT NOT NULL,
  pexels_url TEXT NOT NULL,
  search_query TEXT NOT NULL,
  used_in_type TEXT NOT NULL, -- 'blog', 'city_page', 'faq'
  used_in_id BIGINT NOT NULL,
  photographer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pexels_id, used_in_type, used_in_id)
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_pexels_used_id ON pexels_images_used(pexels_id);
CREATE INDEX IF NOT EXISTS idx_pexels_used_query ON pexels_images_used(search_query);

-- RLS
ALTER TABLE pexels_images_used ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on pexels" ON pexels_images_used
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read pexels" ON pexels_images_used
  FOR SELECT TO anon USING (true);

-- =====================================================
-- PARTIE 5 : FONCTION POUR ÉVITER DOUBLONS IMAGES
-- =====================================================

CREATE OR REPLACE FUNCTION check_pexels_image_not_used(
  p_pexels_id TEXT,
  p_search_query TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Vérifier si l'image a déjà été utilisée
  SELECT COUNT(*) INTO v_count
  FROM pexels_images_used
  WHERE pexels_id = p_pexels_id;

  -- Si jamais utilisée, retourne true (OK)
  -- Si déjà utilisée, retourne false (KO)
  RETURN v_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTIE 6 : FONCTION ENREGISTRER IMAGE UTILISÉE
-- =====================================================

CREATE OR REPLACE FUNCTION register_pexels_image_used(
  p_pexels_id TEXT,
  p_pexels_url TEXT,
  p_search_query TEXT,
  p_used_in_type TEXT,
  p_used_in_id BIGINT,
  p_photographer TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO pexels_images_used (
    pexels_id,
    pexels_url,
    search_query,
    used_in_type,
    used_in_id,
    photographer
  ) VALUES (
    p_pexels_id,
    p_pexels_url,
    p_search_query,
    p_used_in_type,
    p_used_in_id,
    p_photographer
  )
  ON CONFLICT (pexels_id, used_in_type, used_in_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTIE 7 : NETTOYER LES DOUBLONS EXISTANTS
-- =====================================================

-- Supprimer doublons blog_posts (garde le plus récent)
DELETE FROM blog_posts
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at DESC) as rn
    FROM blog_posts
  ) t WHERE rn > 1
);

-- Supprimer doublons city_pages (garde le plus récent)
DELETE FROM city_pages
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at DESC) as rn
    FROM city_pages
  ) t WHERE rn > 1
);

-- =====================================================
-- PARTIE 8 : TRIGGER POUR BLOQUER DOUBLONS
-- =====================================================

-- Trigger pour blog_posts
CREATE OR REPLACE FUNCTION prevent_duplicate_blog_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM blog_posts
    WHERE slug = NEW.slug AND id != COALESCE(NEW.id, 0)
  ) THEN
    -- Ajouter timestamp au slug pour le rendre unique
    NEW.slug := NEW.slug || '-' || EXTRACT(EPOCH FROM NOW())::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_duplicate_blog_slug ON blog_posts;
CREATE TRIGGER trigger_prevent_duplicate_blog_slug
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_blog_slug();

-- Trigger pour city_pages
CREATE OR REPLACE FUNCTION prevent_duplicate_city_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM city_pages
    WHERE slug = NEW.slug AND id != COALESCE(NEW.id, 0)
  ) THEN
    -- Ajouter timestamp au slug pour le rendre unique
    NEW.slug := NEW.slug || '-' || EXTRACT(EPOCH FROM NOW())::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_duplicate_city_slug ON city_pages;
CREATE TRIGGER trigger_prevent_duplicate_city_slug
  BEFORE INSERT OR UPDATE ON city_pages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_city_slug();

-- =====================================================
-- PARTIE 9 : GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION check_pexels_image_not_used TO service_role;
GRANT EXECUTE ON FUNCTION register_pexels_image_used TO service_role;
GRANT EXECUTE ON FUNCTION prevent_duplicate_blog_slug TO service_role;
GRANT EXECUTE ON FUNCTION prevent_duplicate_city_slug TO service_role;

-- =====================================================
-- PARTIE 10 : VÉRIFICATION FINALE
-- =====================================================

DO $$
DECLARE
  v_blog_crons INTEGER;
  v_blog_duplicates INTEGER;
  v_city_duplicates INTEGER;
BEGIN
  -- Compter les crons blog actifs
  SELECT COUNT(*) INTO v_blog_crons
  FROM cron.job
  WHERE jobname LIKE '%blog%' AND active = true;

  -- Compter les doublons blog
  SELECT COUNT(*) INTO v_blog_duplicates
  FROM (
    SELECT slug, COUNT(*) as cnt
    FROM blog_posts
    GROUP BY slug
    HAVING COUNT(*) > 1
  ) t;

  -- Compter les doublons city_pages
  SELECT COUNT(*) INTO v_city_duplicates
  FROM (
    SELECT slug, COUNT(*) as cnt
    FROM city_pages
    GROUP BY slug
    HAVING COUNT(*) > 1
  ) t;

  -- Log résultat
  RAISE NOTICE '✅ Crons blog actifs: % (devrait être 1)', v_blog_crons;
  RAISE NOTICE '✅ Doublons blog: % (devrait être 0)', v_blog_duplicates;
  RAISE NOTICE '✅ Doublons city_pages: % (devrait être 0)', v_city_duplicates;

  -- Insérer dans le log
  INSERT INTO cron_execution_log (job_name, status, details)
  VALUES (
    'fix_all_duplicates',
    'success',
    jsonb_build_object(
      'blog_crons', v_blog_crons,
      'blog_duplicates', v_blog_duplicates,
      'city_duplicates', v_city_duplicates,
      'message', 'Système anti-doublons activé'
    )
  );
END $$;
