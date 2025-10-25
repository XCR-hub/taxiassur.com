/*
  # Activation LinkedIn pour TaxiAssur

  Configure LinkedIn dans social_networks avec :
  - Client ID OAuth 2.0
  - Client Secret
  - Access Token (durée 60 jours)
  - Scopes : w_member_social + w_organization_social
  - Auto-publication activée

  ⚠️ IMPORTANT : Remplacez YOUR_ACCESS_TOKEN_HERE par le token obtenu

  À exécuter dans Supabase SQL Editor
*/

DO $$
DECLARE
  has_name BOOLEAN;
  has_category BOOLEAN;
  has_url BOOLEAN;
  has_updated_at BOOLEAN;
  has_access_token BOOLEAN;
BEGIN
  -- Vérifier les colonnes existantes
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'name'
  ) INTO has_name;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'category'
  ) INTO has_category;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'url'
  ) INTO has_url;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'updated_at'
  ) INTO has_updated_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_networks' AND column_name = 'access_token'
  ) INTO has_access_token;

  -- Ajouter les colonnes manquantes si nécessaire
  IF NOT has_category THEN
    ALTER TABLE social_networks ADD COLUMN category text DEFAULT 'social';
  END IF;

  IF NOT has_url THEN
    ALTER TABLE social_networks ADD COLUMN url text;
  END IF;

  IF NOT has_updated_at THEN
    ALTER TABLE social_networks ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  IF NOT has_access_token THEN
    ALTER TABLE social_networks ADD COLUMN access_token text;
  END IF;

  -- Supprimer les doublons LinkedIn existants
  DELETE FROM social_networks
  WHERE platform = 'linkedin'
  AND ctid NOT IN (
    SELECT MAX(ctid)
    FROM social_networks
    WHERE platform = 'linkedin'
  );

  -- Supprimer LinkedIn existant
  DELETE FROM social_networks WHERE platform = 'linkedin';

  -- Insérer LinkedIn avec configuration complète
  IF has_name THEN
    INSERT INTO social_networks (
      platform,
      name,
      category,
      url,
      is_active,
      is_connected,
      auto_publish,
      config,
      access_token,
      updated_at
    ) VALUES (
      'linkedin',
      'LinkedIn TaxiAssur',
      'social',
      'https://www.linkedin.com/company/taxiassur',
      true,
      true,
      true,
      jsonb_build_object(
        'client_id', '78jlte9c2mbjw5',
        'client_secret', 'WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw==',
        'redirect_uri', 'https://taxiassur.com/auth/linkedin/callback',
        'scopes', ARRAY['openid', 'profile', 'email', 'w_member_social', 'w_organization_social'],
        'token_expires_in', 5184000,
        'token_type', 'Bearer'
      ),
      'YOUR_ACCESS_TOKEN_HERE',
      now()
    );
  ELSE
    INSERT INTO social_networks (
      platform,
      category,
      url,
      is_active,
      is_connected,
      auto_publish,
      config,
      access_token,
      updated_at
    ) VALUES (
      'linkedin',
      'social',
      'https://www.linkedin.com/company/taxiassur',
      true,
      true,
      true,
      jsonb_build_object(
        'client_id', '78jlte9c2mbjw5',
        'client_secret', 'WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw==',
        'redirect_uri', 'https://taxiassur.com/auth/linkedin/callback',
        'scopes', ARRAY['openid', 'profile', 'email', 'w_member_social', 'w_organization_social'],
        'token_expires_in', 5184000,
        'token_type', 'Bearer'
      ),
      'YOUR_ACCESS_TOKEN_HERE',
      now()
    );
  END IF;

  RAISE NOTICE '✅ LinkedIn configuré avec succès !';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT : Remplacez YOUR_ACCESS_TOKEN_HERE par votre vrai token !';
  RAISE NOTICE '';
  RAISE NOTICE 'UPDATE social_networks';
  RAISE NOTICE 'SET access_token = ''votre_access_token''';
  RAISE NOTICE 'WHERE platform = ''linkedin'';';
  RAISE NOTICE '';
END $$;

-- Vérifier que tout est OK
SELECT
  id,
  platform,
  COALESCE(name, 'N/A') as name,
  COALESCE(category, 'N/A') as category,
  COALESCE(url, 'N/A') as url,
  is_active,
  is_connected,
  auto_publish,
  config->>'client_id' as client_id,
  CASE
    WHEN access_token = 'YOUR_ACCESS_TOKEN_HERE' THEN '❌ TOKEN À REMPLACER'
    WHEN access_token IS NULL THEN '❌ TOKEN MANQUANT'
    ELSE '✅ TOKEN CONFIGURÉ'
  END as token_status,
  created_at
FROM social_networks
WHERE platform = 'linkedin';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 LINKEDIN CONFIGURÉ !';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Platform: linkedin';
  RAISE NOTICE '✅ Category: social';
  RAISE NOTICE '✅ URL: https://www.linkedin.com/company/taxiassur';
  RAISE NOTICE '✅ Scopes: w_member_social + w_organization_social';
  RAISE NOTICE '✅ Auto-publish: true';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ÉTAPES SUIVANTES:';
  RAISE NOTICE '   1. Ouvrir le fichier GET-LINKEDIN-REFRESH-TOKEN.html';
  RAISE NOTICE '   2. Suivre les instructions pour activer w_organization_social';
  RAISE NOTICE '   3. Autoriser l''application LinkedIn';
  RAISE NOTICE '   4. Copier l''Access Token obtenu';
  RAISE NOTICE '   5. Exécuter :';
  RAISE NOTICE '      UPDATE social_networks';
  RAISE NOTICE '      SET access_token = ''votre_token''';
  RAISE NOTICE '      WHERE platform = ''linkedin'';';
  RAISE NOTICE '';
END $$;
