-- =====================================================
-- FIX PINTEREST - Configuration Complète
-- =====================================================
-- Ce script assure que la table social_networks a toutes
-- les colonnes nécessaires pour Pinterest

-- 1️⃣ Ajouter les colonnes manquantes (si elles n'existent pas)
DO $$
BEGIN
  -- Ajouter access_token si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN access_token text;
  END IF;

  -- Ajouter refresh_token si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'refresh_token'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN refresh_token text;
  END IF;

  -- Ajouter token_expires_at si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN token_expires_at timestamptz;
  END IF;

  -- Ajouter auto_publish si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'auto_publish'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN auto_publish boolean DEFAULT false;
  END IF;

  -- Ajouter config si manquant (au lieu de api_credentials ou metadata)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'config'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'social_networks' AND column_name = 'api_credentials'
    ) THEN
      -- Renommer api_credentials en config
      ALTER TABLE social_networks RENAME COLUMN api_credentials TO config;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'social_networks' AND column_name = 'metadata'
    ) THEN
      -- Renommer metadata en config
      ALTER TABLE social_networks RENAME COLUMN metadata TO config;
    ELSE
      -- Créer config
      ALTER TABLE social_networks ADD COLUMN config jsonb DEFAULT '{}'::jsonb;
    END IF;
  END IF;

  -- Ajouter is_connected si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'is_connected'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN is_connected boolean DEFAULT false;
  END IF;

  -- Ajouter platform si manquant (au lieu de name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'platform'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'social_networks' AND column_name = 'name'
    ) THEN
      -- Ajouter platform basé sur name
      ALTER TABLE social_networks ADD COLUMN platform text;
      UPDATE social_networks SET platform = LOWER(REPLACE(name, ' ', '_'));
    ELSE
      ALTER TABLE social_networks ADD COLUMN platform text;
    END IF;
  END IF;
END $$;

-- 2️⃣ Créer ou mettre à jour Pinterest
INSERT INTO social_networks (
  platform,
  name,
  is_active,
  is_connected,
  auto_publish,
  access_token,
  config
)
VALUES (
  'pinterest',
  'Pinterest',
  true,
  true,
  true,
  'pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA',
  jsonb_build_object(
    'app_id', '1534523',
    'app_secret', '2aae5684dc5aa6efad09b6f48b7167d159b05b2d',
    'api_version', 'v5',
    'board_id', null
  )
)
ON CONFLICT (platform)
DO UPDATE SET
  is_active = true,
  is_connected = true,
  auto_publish = true,
  access_token = 'pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA',
  config = jsonb_build_object(
    'app_id', '1534523',
    'app_secret', '2aae5684dc5aa6efad09b6f48b7167d159b05b2d',
    'api_version', 'v5',
    'board_id', null
  ),
  updated_at = now();

-- 3️⃣ Ajouter une contrainte unique sur platform si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_networks_platform_key'
  ) THEN
    ALTER TABLE social_networks ADD CONSTRAINT social_networks_platform_key UNIQUE (platform);
  END IF;
END $$;

-- 4️⃣ Vérifier la configuration finale
SELECT
  id,
  platform,
  name,
  is_active,
  is_connected,
  auto_publish,
  LEFT(access_token, 30) || '...' as token_preview,
  config->>'app_id' as app_id,
  config->>'api_version' as api_version,
  created_at,
  updated_at
FROM social_networks
WHERE platform = 'pinterest';

-- 5️⃣ Afficher toutes les colonnes de la table
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'social_networks'
ORDER BY ordinal_position;
