-- =====================================================
-- FIX PINTEREST - Version Simple et Sûre
-- =====================================================
-- Ce script s'adapte automatiquement à votre structure

-- 1️⃣ Ajouter toutes les colonnes nécessaires (si manquantes)
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

  -- platform (si n'existe pas)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'platform'
  ) THEN
    ALTER TABLE social_networks ADD COLUMN platform text;
    -- Copier depuis name si name existe
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'social_networks' AND column_name = 'name'
    ) THEN
      UPDATE social_networks SET platform = LOWER(REPLACE(name, ' ', '_')) WHERE platform IS NULL;
    END IF;
  END IF;

  -- Renommer api_credentials ou metadata en config
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

-- 2️⃣ Vérifier quelle structure on a maintenant
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'social_networks'
ORDER BY ordinal_position;

-- 3️⃣ Ajouter contrainte unique sur platform (si pas déjà là)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_networks_platform_key'
  ) THEN
    ALTER TABLE social_networks ADD CONSTRAINT social_networks_platform_key UNIQUE (platform);
  END IF;
EXCEPTION
  WHEN duplicate_key THEN
    -- Si erreur de doublon, on supprime les doublons d'abord
    DELETE FROM social_networks a USING social_networks b
    WHERE a.id < b.id AND a.platform = b.platform;
    -- Puis on ajoute la contrainte
    ALTER TABLE social_networks ADD CONSTRAINT social_networks_platform_key UNIQUE (platform);
END $$;

-- 4️⃣ Préparer la requête d'insertion dynamique
DO $$
DECLARE
  has_updated_at boolean;
  has_name boolean;
  insert_query text;
BEGIN
  -- Vérifier quelles colonnes existent
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'updated_at'
  ) INTO has_updated_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'name'
  ) INTO has_name;

  -- Construire la requête INSERT dynamiquement
  insert_query := '
    INSERT INTO social_networks (
      platform,
      ' || CASE WHEN has_name THEN 'name,' ELSE '' END || '
      is_active,
      is_connected,
      auto_publish,
      access_token,
      config
    )
    VALUES (
      ''pinterest'',
      ' || CASE WHEN has_name THEN '''Pinterest'',' ELSE '' END || '
      true,
      true,
      true,
      ''pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA'',
      jsonb_build_object(
        ''app_id'', ''1534523'',
        ''app_secret'', ''2aae5684dc5aa6efad09b6f48b7167d159b05b2d'',
        ''api_version'', ''v5''
      )
    )
    ON CONFLICT (platform)
    DO UPDATE SET
      is_active = true,
      is_connected = true,
      auto_publish = true,
      access_token = ''pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA'',
      config = jsonb_build_object(
        ''app_id'', ''1534523'',
        ''app_secret'', ''2aae5684dc5aa6efad09b6f48b7167d159b05b2d'',
        ''api_version'', ''v5''
      )' || CASE WHEN has_updated_at THEN ',
      updated_at = now()' ELSE '' END;

  -- Exécuter la requête
  EXECUTE insert_query;
END $$;

-- 5️⃣ Vérifier que Pinterest est bien configuré
SELECT
  platform,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'name'
  ) THEN name ELSE 'Pinterest' END as name,
  is_active,
  is_connected,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'auto_publish'
  ) THEN auto_publish ELSE false END as auto_publish,
  LEFT(access_token, 30) || '...' as token_preview,
  config->>'app_id' as app_id,
  config->>'api_version' as api_version
FROM social_networks
WHERE platform = 'pinterest';
