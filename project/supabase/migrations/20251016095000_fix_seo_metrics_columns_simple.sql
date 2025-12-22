/*
  # Fix seo_metrics columns - Version simplifiée

  1. Problème
    - ERROR: column "average_position" does not exist
    - La migration précédente n'a pas été appliquée ou a échoué

  2. Solution
    - ALTER TABLE direct sans IF NOT EXISTS
    - Utiliser BEGIN/EXCEPTION pour ignorer si colonne existe déjà
*/

-- Ajouter average_position avec gestion d'erreur
DO $$
BEGIN
  BEGIN
    ALTER TABLE seo_metrics ADD COLUMN average_position numeric(5,2) DEFAULT 0;
    RAISE NOTICE 'Colonne average_position ajoutée';
  EXCEPTION
    WHEN duplicate_column THEN
      RAISE NOTICE 'Colonne average_position existe déjà';
  END;
END $$;

-- Ajouter updated_at avec gestion d'erreur
DO $$
BEGIN
  BEGIN
    ALTER TABLE seo_metrics ADD COLUMN updated_at timestamptz DEFAULT NOW();
    RAISE NOTICE 'Colonne updated_at ajoutée';
  EXCEPTION
    WHEN duplicate_column THEN
      RAISE NOTICE 'Colonne updated_at existe déjà';
  END;
END $$;

-- Ajouter ctr avec gestion d'erreur
DO $$
BEGIN
  BEGIN
    ALTER TABLE seo_metrics ADD COLUMN ctr numeric(5,2) DEFAULT 0;
    RAISE NOTICE 'Colonne ctr ajoutée';
  EXCEPTION
    WHEN duplicate_column THEN
      RAISE NOTICE 'Colonne ctr existe déjà';
  END;
END $$;

-- Vérifier que toutes les colonnes nécessaires existent
DO $$
DECLARE
  v_columns text[];
  v_missing text[];
  v_required text[] := ARRAY['date', 'total_urls', 'indexed_pages', 'pending_pages',
                             'impressions', 'clicks', 'average_position', 'source',
                             'metadata', 'updated_at', 'ctr'];
  v_col text;
BEGIN
  -- Récupérer colonnes existantes
  SELECT ARRAY_AGG(column_name)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_name = 'seo_metrics';

  -- Vérifier colonnes manquantes
  v_missing := ARRAY[]::text[];
  FOREACH v_col IN ARRAY v_required LOOP
    IF NOT (v_col = ANY(v_columns)) THEN
      v_missing := array_append(v_missing, v_col);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE WARNING 'Colonnes manquantes: %', array_to_string(v_missing, ', ');
  ELSE
    RAISE NOTICE 'Toutes les colonnes requises sont présentes';
  END IF;

  -- Afficher colonnes présentes
  RAISE NOTICE 'Colonnes seo_metrics: %', array_to_string(v_columns, ', ');
END $$;

-- Créer ou remplacer trigger pour updated_at
DROP TRIGGER IF EXISTS update_seo_metrics_updated_at ON seo_metrics;

CREATE OR REPLACE FUNCTION update_seo_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seo_metrics_updated_at
  BEFORE UPDATE ON seo_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_metrics_updated_at();

-- Test final
SELECT 'Migration terminée - Colonnes ajoutées à seo_metrics' as status;
