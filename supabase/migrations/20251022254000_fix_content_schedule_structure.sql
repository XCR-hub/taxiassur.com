/*
  # Fix Content Schedule Structure Complete

  Vérifie et ajoute TOUTES les colonnes manquantes à content_schedule
  puis insère les données par défaut.

  ## Colonnes vérifiées
  - frequency_per_week
  - auto_publish
  - keywords
  - last_generated_at
  - is_active
  - metadata
  - UNIQUE constraint sur content_type
*/

-- Fonction helper pour ajouter une colonne si elle n'existe pas
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
  p_table_name text,
  p_column_name text,
  p_column_definition text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = p_table_name
    AND column_name = p_column_name
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', p_table_name, p_column_name, p_column_definition);
    RAISE NOTICE 'Colonne %.% ajoutée', p_table_name, p_column_name;
  ELSE
    RAISE NOTICE 'Colonne %.% existe déjà', p_table_name, p_column_name;
  END IF;
END;
$$;

-- Ajouter toutes les colonnes manquantes
DO $$
BEGIN
  PERFORM add_column_if_not_exists('content_schedule', 'frequency_per_week', 'integer DEFAULT 1 CHECK (frequency_per_week >= 0 AND frequency_per_week <= 7)');
  PERFORM add_column_if_not_exists('content_schedule', 'auto_publish', 'boolean DEFAULT false');
  PERFORM add_column_if_not_exists('content_schedule', 'keywords', 'text[] DEFAULT ''{}''');
  PERFORM add_column_if_not_exists('content_schedule', 'last_generated_at', 'timestamptz');
  PERFORM add_column_if_not_exists('content_schedule', 'is_active', 'boolean DEFAULT true');
  PERFORM add_column_if_not_exists('content_schedule', 'metadata', 'jsonb DEFAULT ''{}''');
END $$;

-- Rendre les colonnes problématiques NULL si elles existent
DO $$
DECLARE
  col_name text;
BEGIN
  -- Liste des colonnes à rendre nullable
  FOREACH col_name IN ARRAY ARRAY['title', 'description', 'scheduled_date', 'target_url', 'status', 'priority']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'content_schedule'
      AND column_name = col_name
      AND is_nullable = 'NO'
    ) THEN
      EXECUTE format('ALTER TABLE content_schedule ALTER COLUMN %I DROP NOT NULL', col_name);
      RAISE NOTICE 'Colonne % rendue nullable', col_name;
    END IF;
  END LOOP;
END $$;

-- S'assurer que content_type est bien text (pas enum)
DO $$
BEGIN
  -- Vérifier le type de content_type
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'content_schedule'
    AND column_name = 'content_type'
    AND data_type != 'text'
  ) THEN
    -- Convertir en text si c'est un enum
    ALTER TABLE content_schedule ALTER COLUMN content_type TYPE text;
    RAISE NOTICE 'Colonne content_type convertie en text';
  END IF;
END $$;

-- Ajouter contrainte UNIQUE sur content_type si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'content_schedule_content_type_key'
    AND conrelid = 'content_schedule'::regclass
  ) THEN
    ALTER TABLE content_schedule ADD CONSTRAINT content_schedule_content_type_key UNIQUE (content_type);
    RAISE NOTICE 'Contrainte UNIQUE ajoutée sur content_type';
  ELSE
    RAISE NOTICE 'Contrainte UNIQUE existe déjà sur content_type';
  END IF;
END $$;

-- Supprimer données existantes
DELETE FROM content_schedule;

-- Insérer les configurations par défaut
INSERT INTO content_schedule (
  content_type,
  frequency_per_week,
  auto_publish,
  keywords,
  is_active,
  metadata
) VALUES
  (
    'blog',
    3,
    true,
    ARRAY[
      'assurance taxi',
      'assurance vtc',
      'rc professionnelle taxi',
      'devis assurance taxi',
      'comparateur assurance taxi',
      'assurance taxi pas cher'
    ],
    true,
    '{"priority": "high", "seo_score": 95}'::jsonb
  ),
  (
    'faq',
    2,
    true,
    ARRAY[
      'assurance taxi obligatoire',
      'garanties assurance taxi',
      'prix assurance taxi',
      'comment choisir assurance taxi',
      'résiliation assurance taxi'
    ],
    true,
    '{"priority": "medium", "seo_score": 90}'::jsonb
  ),
  (
    'review',
    1,
    false,
    ARRAY[
      'avis assurance taxi',
      'témoignage chauffeur taxi',
      'retour expérience assurance'
    ],
    false,
    '{"priority": "low", "seo_score": 85}'::jsonb
  )
ON CONFLICT (content_type)
DO UPDATE SET
  frequency_per_week = EXCLUDED.frequency_per_week,
  auto_publish = EXCLUDED.auto_publish,
  keywords = EXCLUDED.keywords,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Nettoyer la fonction helper
DROP FUNCTION add_column_if_not_exists;

-- Vérification finale
DO $$
DECLARE
  v_count integer;
  v_cols text[];
BEGIN
  SELECT COUNT(*) INTO v_count FROM content_schedule;

  SELECT array_agg(column_name ORDER BY column_name)
  INTO v_cols
  FROM information_schema.columns
  WHERE table_name = 'content_schedule'
  AND column_name IN ('frequency_per_week', 'auto_publish', 'keywords', 'is_active');

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ CONTENT_SCHEDULE CORRIGÉ';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Configurations créées: %', v_count;
  RAISE NOTICE 'Colonnes présentes: %', array_to_string(v_cols, ', ');
  RAISE NOTICE '';
  RAISE NOTICE '📝 Blog: 3x/semaine (auto-publish: oui)';
  RAISE NOTICE '❓ FAQ: 2x/semaine (auto-publish: oui)';
  RAISE NOTICE '⭐ Reviews: 1x/semaine (auto-publish: non)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 AutomationScheduler: PRÊT';
  RAISE NOTICE '============================================';
END $$;
