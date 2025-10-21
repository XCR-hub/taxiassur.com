-- =====================================================
-- ACTIVER PINTEREST - Version Ultra-Simple
-- =====================================================
-- Ce script active Pinterest en toute sécurité

-- 1️⃣ Ajouter les colonnes manquantes
DO $$
BEGIN
  -- access_token
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN access_token text;
  END IF;

  -- refresh_token
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'refresh_token'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN refresh_token text;
  END IF;

  -- token_expires_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN token_expires_at timestamptz;
  END IF;

  -- auto_publish
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'auto_publish'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN auto_publish boolean DEFAULT false;
  END IF;

  -- is_connected
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'is_connected'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN is_connected boolean DEFAULT false;
  END IF;

  -- updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- platform
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'platform'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN platform text;
    -- Copier depuis name si existe
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'social_networks' AND column_name = 'name'
    ) THEN
      UPDATE social_networks SET platform = LOWER(REPLACE(name, ' ', '_')) WHERE platform IS NULL;
    END IF;
  END IF;

  -- Gérer config (renommer api_credentials ou metadata)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'config'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'social_networks' AND column_name = 'api_credentials'
    ) THEN
      ALTER TABLE social_networks RENAME COLUMN api_credentials TO config;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'social_networks' AND column_name = 'metadata'
    ) THEN
      ALTER TABLE social_networks RENAME COLUMN metadata TO config;
    ELSE
      ALTER TABLE social_networks ADD COLUMN config jsonb DEFAULT '{}'::jsonb;
    END IF;
  END IF;
END $$;

-- 2️⃣ Supprimer les doublons Pinterest (si existent)
DELETE FROM social_networks
WHERE platform = 'pinterest'
AND id NOT IN (
  SELECT MIN(id)
  FROM social_networks
  WHERE platform = 'pinterest'
);

-- 3️⃣ Ajouter contrainte unique sur platform (sans gestion d'exception)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_networks_platform_key'
  ) THEN
    ALTER TABLE social_networks ADD CONSTRAINT social_networks_platform_key UNIQUE (platform);
  END IF;
END $$;

-- 4️⃣ Insérer/Mettre à jour Pinterest
DO $$
DECLARE
  has_updated_at boolean;
  has_name boolean;
BEGIN
  -- Vérifier colonnes
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'updated_at'
  ) INTO has_updated_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'name'
  ) INTO has_name;

  -- Supprimer Pinterest existant
  DELETE FROM social_networks WHERE platform = 'pinterest';

  -- Insérer Pinterest
  IF has_name THEN
    INSERT INTO social_networks (
      platform,
      name,
      is_active,
      is_connected,
      auto_publish,
      access_token,
      config,
      updated_at
    ) VALUES (
      'pinterest',
      'Pinterest',
      true,
      true,
      true,
      'pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA',
      jsonb_build_object(
        'app_id', '1534523',
        'app_secret', '2aae5684dc5aa6efad09b6f48b7167d159b05b2d',
        'api_version', 'v5'
      ),
      CASE WHEN has_updated_at THEN now() ELSE NULL END
    );
  ELSE
    INSERT INTO social_networks (
      platform,
      is_active,
      is_connected,
      auto_publish,
      access_token,
      config,
      updated_at
    ) VALUES (
      'pinterest',
      true,
      true,
      true,
      'pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA',
      jsonb_build_object(
        'app_id', '1534523',
        'app_secret', '2aae5684dc5aa6efad09b6f48b7167d159b05b2d',
        'api_version', 'v5'
      ),
      CASE WHEN has_updated_at THEN now() ELSE NULL END
    );
  END IF;
END $$;

-- 5️⃣ Vérifier que tout est OK
SELECT
  id,
  platform,
  is_active,
  is_connected,
  auto_publish,
  LEFT(access_token, 30) || '...' as token_preview,
  config->>'app_id' as app_id,
  config->>'api_version' as api_version,
  created_at
FROM social_networks
WHERE platform = 'pinterest';

-- 6️⃣ Afficher la structure de la table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'social_networks'
ORDER BY ordinal_position;
