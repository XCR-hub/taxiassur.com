/*
  # Activation YouTube pour TaxiAssur

  Configure YouTube dans social_networks avec :
  - Client ID OAuth 2.0
  - Client Secret
  - User ID & Channel ID
  - Auto-publication activée

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

  -- Ajouter la colonne category si elle n'existe pas
  IF NOT has_category THEN
    ALTER TABLE social_networks ADD COLUMN category text DEFAULT 'social';
    RAISE NOTICE 'Colonne category ajoutée';
  END IF;

  -- Ajouter la colonne url si elle n'existe pas
  IF NOT has_url THEN
    ALTER TABLE social_networks ADD COLUMN url text;
    RAISE NOTICE 'Colonne url ajoutée';
  END IF;

  -- Ajouter la colonne updated_at si elle n'existe pas
  IF NOT has_updated_at THEN
    ALTER TABLE social_networks ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE 'Colonne updated_at ajoutée';
  END IF;

  -- Ajouter la colonne access_token si elle n'existe pas
  IF NOT has_access_token THEN
    ALTER TABLE social_networks ADD COLUMN access_token text;
    RAISE NOTICE 'Colonne access_token ajoutée';
  END IF;

  -- Supprimer les doublons YouTube existants (garder le plus récent)
  DELETE FROM social_networks
  WHERE platform = 'youtube'
  AND ctid NOT IN (
    SELECT MAX(ctid)
    FROM social_networks
    WHERE platform = 'youtube'
  );

  -- Supprimer YouTube existant
  DELETE FROM social_networks WHERE platform = 'youtube';

  -- Insérer YouTube avec toutes les colonnes
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
      updated_at
    ) VALUES (
      'youtube',
      'YouTube TaxiAssur',
      'video',
      'https://www.youtube.com/@taxiassur',
      true,
      false,
      true,
      jsonb_build_object(
        'client_id', '99189284491-ddokaugpdm678de7amea7qr5pege34ic.apps.googleusercontent.com',
        'client_secret', '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',
        'user_id', 'A6e6kCpI-6E_kpjGRLXY7A',
        'channel_id', 'UCA6e6kCpI-6E_kpjGRLXY7A',
        'api_version', 'v3',
        'redirect_uri', 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/youtube-oauth-callback',
        'scopes', ARRAY['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube']
      ),
      CASE WHEN has_updated_at THEN now() ELSE NULL END
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
      updated_at
    ) VALUES (
      'youtube',
      'video',
      'https://www.youtube.com/@taxiassur',
      true,
      false,
      true,
      jsonb_build_object(
        'client_id', '99189284491-ddokaugpdm678de7amea7qr5pege34ic.apps.googleusercontent.com',
        'client_secret', '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',
        'user_id', 'A6e6kCpI-6E_kpjGRLXY7A',
        'channel_id', 'UCA6e6kCpI-6E_kpjGRLXY7A',
        'api_version', 'v3',
        'redirect_uri', 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/youtube-oauth-callback',
        'scopes', ARRAY['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube']
      ),
      CASE WHEN has_updated_at THEN now() ELSE NULL END
    );
  END IF;

  RAISE NOTICE '✅ YouTube configuré avec succès !';
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
  config->>'channel_id' as channel_id,
  created_at
FROM social_networks
WHERE platform = 'youtube';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 YOUTUBE ACTIVÉ !';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Platform: youtube';
  RAISE NOTICE '✅ Category: video';
  RAISE NOTICE '✅ URL: https://www.youtube.com/@taxiassur';
  RAISE NOTICE '✅ Channel ID: UCA6e6kCpI-6E_kpjGRLXY7A';
  RAISE NOTICE '✅ Auto-publish: true';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  PROCHAINE ÉTAPE:';
  RAISE NOTICE '   1. Ouvrir le fichier GET-YOUTUBE-REFRESH-TOKEN.html';
  RAISE NOTICE '   2. Autoriser l''application YouTube';
  RAISE NOTICE '   3. Copier le Refresh Token obtenu';
  RAISE NOTICE '   4. Ajouter le secret dans Edge Functions:';
  RAISE NOTICE '      YOUTUBE_REFRESH_TOKEN=votre_token';
  RAISE NOTICE '';
END $$;
