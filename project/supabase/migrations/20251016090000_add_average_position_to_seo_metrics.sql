/*
  # Add average_position column to seo_metrics

  1. Problème
    - ERROR: column "average_position" of relation "seo_metrics" does not exist
    - La fonction populate_real_seo_metrics() essaie d'insérer average_position
    - Mais la colonne n'existe pas dans la table actuelle

  2. Solution
    - Ajouter colonne average_position si elle n'existe pas
    - Ajouter aussi updated_at pour cohérence
    - Mettre à jour index
*/

-- Ajouter colonne average_position si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seo_metrics' AND column_name = 'average_position'
  ) THEN
    ALTER TABLE seo_metrics ADD COLUMN average_position numeric(5,2) DEFAULT 0;
  END IF;
END $$;

-- Ajouter colonne updated_at si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seo_metrics' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE seo_metrics ADD COLUMN updated_at timestamptz DEFAULT NOW();
  END IF;
END $$;

-- Ajouter colonne ctr si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seo_metrics' AND column_name = 'ctr'
  ) THEN
    ALTER TABLE seo_metrics ADD COLUMN ctr numeric(5,2) DEFAULT 0;
  END IF;
END $$;

-- Créer trigger pour auto-update updated_at
DROP TRIGGER IF EXISTS update_seo_metrics_updated_at ON seo_metrics;

CREATE TRIGGER update_seo_metrics_updated_at
  BEFORE UPDATE ON seo_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Vérifier structure finale
DO $$
DECLARE
  v_columns text;
BEGIN
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_name = 'seo_metrics';

  RAISE NOTICE 'Colonnes seo_metrics: %', v_columns;
END $$;
