/*
  # Activation LinkedIn pour TaxiAssur - PROFIL PERSONNEL

  Configuration pour publication sur PROFIL PERSONNEL uniquement
  Scope disponible : w_member_social (déjà activé)

  ⚠️ LIMITATION : Ne peut PAS publier sur page entreprise
  ✅ AVANTAGE : Disponible immédiatement sans demande d'accès

  Pour publier sur page entreprise :
  → Demander accès à "Community Management API" dans LinkedIn Developer

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

  -- Insérer LinkedIn avec configuration PROFIL PERSONNEL
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
      'LinkedIn TaxiAssur (Profil Personnel)',
      'social',
      'https://www.linkedin.com',
      true,
      true,
      true,
      jsonb_build_object(
        'client_id', '78jlte9c2mbjw5',
        'client_secret', 'WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw==',
        'redirect_uri', 'https://taxiassur.com/auth/linkedin/callback',
        'scopes', ARRAY['openid', 'profile', 'email', 'w_member_social'],
        'token_expires_in', 5184000,
        'token_type', 'Bearer',
        'publish_mode', 'personal_profile',
        'note', 'Publication sur profil personnel uniquement. Pour page entreprise, activer Community Management API.'
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
      'https://www.linkedin.com',
      true,
      true,
      true,
      jsonb_build_object(
        'client_id', '78jlte9c2mbjw5',
        'client_secret', 'WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw==',
        'redirect_uri', 'https://taxiassur.com/auth/linkedin/callback',
        'scopes', ARRAY['openid', 'profile', 'email', 'w_member_social'],
        'token_expires_in', 5184000,
        'token_type', 'Bearer',
        'publish_mode', 'personal_profile',
        'note', 'Publication sur profil personnel uniquement. Pour page entreprise, activer Community Management API.'
      ),
      'YOUR_ACCESS_TOKEN_HERE',
      now()
    );
  END IF;

  RAISE NOTICE '✅ LinkedIn configuré avec succès !';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  MODE : PROFIL PERSONNEL UNIQUEMENT';
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
  config->>'publish_mode' as publish_mode,
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
  RAISE NOTICE '🎉 LINKEDIN CONFIGURÉ (PROFIL PERSONNEL) !';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Platform: linkedin';
  RAISE NOTICE '✅ Mode: Profil Personnel';
  RAISE NOTICE '✅ Scopes: w_member_social (activé)';
  RAISE NOTICE '✅ Products: Share on LinkedIn (activé)';
  RAISE NOTICE '✅ Auto-publish: true';
  RAISE NOTICE '';
  RAISE NOTICE '📝 VOUS POUVEZ PUBLIER SUR :';
  RAISE NOTICE '   ✅ Votre profil personnel LinkedIn';
  RAISE NOTICE '   ❌ Page entreprise (nécessite Community Management API)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ÉTAPES SUIVANTES:';
  RAISE NOTICE '   1. Ouvrir le fichier GET-LINKEDIN-REFRESH-TOKEN.html';
  RAISE NOTICE '   2. Autoriser l''application LinkedIn';
  RAISE NOTICE '   3. Copier l''Access Token obtenu';
  RAISE NOTICE '   4. Exécuter :';
  RAISE NOTICE '      UPDATE social_networks';
  RAISE NOTICE '      SET access_token = ''votre_token''';
  RAISE NOTICE '      WHERE platform = ''linkedin'';';
  RAISE NOTICE '';
  RAISE NOTICE '💡 POUR PUBLIER SUR PAGE ENTREPRISE :';
  RAISE NOTICE '   1. LinkedIn Developer → Products → Community Management API';
  RAISE NOTICE '   2. Cliquer "Request access"';
  RAISE NOTICE '   3. Attendre approbation LinkedIn';
  RAISE NOTICE '   4. Scope w_organization_social sera disponible';
  RAISE NOTICE '';
END $$;
