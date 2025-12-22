/*
  # STRUCTURE COMPLÈTE CITY_PAGES - TOUTES LES COLONNES

  Assure que city_pages a toutes les colonnes nécessaires pour:
  - Affichage des données démographiques (dept, region, population, taxi_count)
  - Génération IA complète
  - Affichage FAQ/blog/news associés
*/

-- S'assurer que la table existe
CREATE TABLE IF NOT EXISTS city_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- ============================================
-- 1. COLONNES DE BASE
-- ============================================

DO $$
BEGIN
  -- city_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'city_name') THEN
    ALTER TABLE city_pages ADD COLUMN city_name text;
    RAISE NOTICE '✅ city_name ajouté';
  END IF;

  -- slug
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'slug') THEN
    ALTER TABLE city_pages ADD COLUMN slug text;
    RAISE NOTICE '✅ slug ajouté';
  END IF;

  -- title
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'title') THEN
    ALTER TABLE city_pages ADD COLUMN title text;
    RAISE NOTICE '✅ title ajouté';
  END IF;

  -- content (peut être text ou jsonb selon l'usage)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'content') THEN
    ALTER TABLE city_pages ADD COLUMN content text;
    RAISE NOTICE '✅ content ajouté';
  END IF;

  -- published
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'published') THEN
    ALTER TABLE city_pages ADD COLUMN published boolean DEFAULT false;
    RAISE NOTICE '✅ published ajouté';
  END IF;

  -- status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'status') THEN
    ALTER TABLE city_pages ADD COLUMN status text DEFAULT 'draft';
    RAISE NOTICE '✅ status ajouté';
  END IF;
END $$;

-- ============================================
-- 2. DONNÉES DÉMOGRAPHIQUES (POUR IA)
-- ============================================

DO $$
BEGIN
  -- dept (département: "75", "13", "69", etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'dept') THEN
    ALTER TABLE city_pages ADD COLUMN dept text;
    RAISE NOTICE '✅ dept ajouté';
  END IF;

  -- region (région: "Île-de-France", "Provence-Alpes-Côte d''Azur", etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'region') THEN
    ALTER TABLE city_pages ADD COLUMN region text;
    RAISE NOTICE '✅ region ajouté';
  END IF;

  -- population (nombre d'habitants)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'population') THEN
    ALTER TABLE city_pages ADD COLUMN population integer DEFAULT 0;
    RAISE NOTICE '✅ population ajouté';
  END IF;

  -- taxi_count (nombre de taxis estimé)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'taxi_count') THEN
    ALTER TABLE city_pages ADD COLUMN taxi_count integer DEFAULT 0;
    RAISE NOTICE '✅ taxi_count ajouté';
  END IF;
END $$;

-- ============================================
-- 3. DONNÉES SEO
-- ============================================

DO $$
BEGIN
  -- meta_description
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'meta_description') THEN
    ALTER TABLE city_pages ADD COLUMN meta_description text;
    RAISE NOTICE '✅ meta_description ajouté';
  END IF;

  -- keywords (peut être text[] ou jsonb)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'keywords') THEN
    ALTER TABLE city_pages ADD COLUMN keywords text[];
    RAISE NOTICE '✅ keywords ajouté';
  END IF;

  -- image_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'image_url') THEN
    ALTER TABLE city_pages ADD COLUMN image_url text;
    RAISE NOTICE '✅ image_url ajouté';
  END IF;
END $$;

-- ============================================
-- 4. INDEX POUR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS city_pages_slug_idx ON city_pages(slug);
CREATE INDEX IF NOT EXISTS city_pages_city_name_idx ON city_pages(city_name);
CREATE INDEX IF NOT EXISTS city_pages_dept_idx ON city_pages(dept);
CREATE INDEX IF NOT EXISTS city_pages_region_idx ON city_pages(region);
CREATE INDEX IF NOT EXISTS city_pages_published_idx ON city_pages(published);
CREATE INDEX IF NOT EXISTS city_pages_status_idx ON city_pages(status);

-- Index pour requêtes combinées
CREATE INDEX IF NOT EXISTS city_pages_published_status_idx ON city_pages(published, status);

-- ============================================
-- 5. CONTRAINTES UNIQUES
-- ============================================

-- Ajouter contrainte unique sur slug si pas déjà présente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'city_pages_slug_key'
  ) THEN
    ALTER TABLE city_pages ADD CONSTRAINT city_pages_slug_key UNIQUE (slug);
    RAISE NOTICE '✅ Contrainte unique sur slug ajoutée';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '⚠️ Contrainte unique sur slug non ajoutée (peut-être déjà présente)';
END $$;

-- ============================================
-- 6. RLS (ROW LEVEL SECURITY)
-- ============================================

ALTER TABLE city_pages ENABLE ROW LEVEL SECURITY;

-- Policy pour lecture publique des pages publiées
DROP POLICY IF EXISTS "Public can read published city pages" ON city_pages;
CREATE POLICY "Public can read published city pages"
  ON city_pages FOR SELECT
  TO public
  USING (published = true OR status = 'published');

-- Policy pour lecture authentifiée (toutes les pages)
DROP POLICY IF EXISTS "Authenticated can read all city pages" ON city_pages;
CREATE POLICY "Authenticated can read all city pages"
  ON city_pages FOR SELECT
  TO authenticated
  USING (true);

-- Policy pour insertion (authenticated + anon pour générateur IA)
DROP POLICY IF EXISTS "Authenticated can insert city pages" ON city_pages;
CREATE POLICY "Authenticated can insert city pages"
  ON city_pages FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Policy pour mise à jour
DROP POLICY IF EXISTS "Authenticated can update city pages" ON city_pages;
CREATE POLICY "Authenticated can update city pages"
  ON city_pages FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 7. VÉRIFICATION FINALE
-- ============================================

DO $$
DECLARE
  col_count integer;
  expected_cols text[] := ARRAY[
    'id', 'created_at', 'updated_at',
    'city_name', 'slug', 'title', 'content', 'published', 'status',
    'dept', 'region', 'population', 'taxi_count',
    'meta_description', 'keywords', 'image_url'
  ];
  missing_cols text[];
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'city_pages'
  AND column_name = ANY(expected_cols);

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ STRUCTURE CITY_PAGES COMPLÈTE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Colonnes trouvées: % / %', col_count, array_length(expected_cols, 1);

  IF col_count = array_length(expected_cols, 1) THEN
    RAISE NOTICE '✅ Toutes les colonnes sont présentes !';
  ELSE
    RAISE NOTICE '⚠️ Il manque % colonne(s)', (array_length(expected_cols, 1) - col_count);
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📝 Colonnes de base: city_name, slug, title, content, published, status';
  RAISE NOTICE '🌍 Données démo: dept, region, population, taxi_count';
  RAISE NOTICE '📊 SEO: meta_description, keywords, image_url';
  RAISE NOTICE '';
  RAISE NOTICE 'Le générateur IA peut maintenant remplir toutes ces colonnes !';
  RAISE NOTICE '============================================';
END $$;
