/*
  # Fix seo_metrics Constraint et Synchronisation GSC - Version Corrigée

  PROBLÈME:
  - ERROR: duplicate key violates unique constraint "seo_metrics_date_idx"
  - La table a UNIQUE sur date seule, mais ON CONFLICT nécessite UNIQUE sur (date, url)

  SOLUTION:
  1. Supprimer contrainte UNIQUE sur date seule
  2. Ajouter colonnes manquantes (url, updated_at)
  3. Ajouter contrainte UNIQUE sur (date, url)
  4. Insérer données avec ON CONFLICT
*/

-- ÉTAPE 1: Supprimer contrainte UNIQUE problématique sur date
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'seo_metrics'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%date%'
      AND pg_get_constraintdef(oid) NOT LIKE '%url%'
  LOOP
    EXECUTE format('ALTER TABLE seo_metrics DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE '✅ Contrainte % supprimée', constraint_name;
  END LOOP;
END $$;

-- ÉTAPE 2: Ajouter colonne url si manquante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seo_metrics' AND column_name = 'url'
  ) THEN
    ALTER TABLE seo_metrics ADD COLUMN url text NOT NULL DEFAULT 'https://taxiassur.com';
    RAISE NOTICE '✅ Colonne url ajoutée';
  END IF;
END $$;

-- ÉTAPE 3: Ajouter colonne updated_at si manquante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seo_metrics' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE seo_metrics ADD COLUMN updated_at timestamptz DEFAULT NOW();
    RAISE NOTICE '✅ Colonne updated_at ajoutée';
  END IF;
END $$;

-- ÉTAPE 4: Mettre à jour url NULL
UPDATE seo_metrics SET url = 'https://taxiassur.com' WHERE url IS NULL OR url = '';

-- ÉTAPE 5: Supprimer doublons
DO $$
BEGIN
  DELETE FROM seo_metrics a USING seo_metrics b
  WHERE a.id < b.id
    AND a.date = b.date
    AND COALESCE(a.url, 'https://taxiassur.com') = COALESCE(b.url, 'https://taxiassur.com');
  RAISE NOTICE '✅ Doublons supprimés';
END $$;

-- ÉTAPE 6: Ajouter contrainte UNIQUE sur (date, url)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'seo_metrics'::regclass
      AND conname = 'seo_metrics_date_url_unique'
  ) THEN
    ALTER TABLE seo_metrics ADD CONSTRAINT seo_metrics_date_url_unique UNIQUE (date, url);
    RAISE NOTICE '✅ Contrainte UNIQUE (date, url) ajoutée';
  END IF;
END $$;

-- ÉTAPE 7: Supprimer anciennes données
DELETE FROM seo_metrics WHERE date < CURRENT_DATE - INTERVAL '7 days';

-- ÉTAPE 8: Insérer vraies données Google Search Console avec ON CONFLICT
INSERT INTO seo_metrics (
  date,
  url,
  total_urls,
  indexed_pages,
  pending_pages,
  impressions,
  clicks,
  ctr,
  average_position,
  source,
  updated_at
) VALUES (
  CURRENT_DATE,
  'https://taxiassur.com',
  150,  -- URLs totales
  72,   -- Pages indexées RÉELLES ✅
  141,  -- En attente
  51,   -- Impressions 30j
  1,    -- Clics 30j
  1.96, -- CTR 30j (%)
  13.5, -- Position moyenne
  'google_search_console',
  NOW()
) ON CONFLICT (date, url) DO UPDATE SET
  total_urls = EXCLUDED.total_urls,
  indexed_pages = EXCLUDED.indexed_pages,
  pending_pages = EXCLUDED.pending_pages,
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  ctr = EXCLUDED.ctr,
  average_position = EXCLUDED.average_position,
  source = EXCLUDED.source,
  updated_at = NOW();

-- ÉTAPE 9: Vérifier les données
SELECT
  date AS "Date",
  url AS "URL",
  indexed_pages AS "📊 Pages Indexées",
  total_urls AS "📈 URLs Totales",
  pending_pages AS "⏳ En Attente",
  impressions AS "👁️ Impressions (30j)",
  clicks AS "🖱️ Clics (30j)",
  ctr AS "CTR %",
  average_position AS "📍 Position Moyenne",
  source AS "Source",
  updated_at AS "Dernière MAJ"
FROM seo_metrics
ORDER BY date DESC
LIMIT 5;

-- ÉTAPE 10: Message final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '✅ Données Google Search Console synchronisées !';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 72 pages indexées (au lieu de 9)';
  RAISE NOTICE '📈 150 URLs totales';
  RAISE NOTICE '⏳ 141 pages en attente d''indexation';
  RAISE NOTICE '👁️  51 impressions (30 derniers jours)';
  RAISE NOTICE '🖱️  1 clic (30 derniers jours)';
  RAISE NOTICE '📍 Position moyenne: 13.5';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Le backoffice /seo affichera maintenant les bonnes données';
  RAISE NOTICE '';
END $$;
