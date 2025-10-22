/*
  # Activation Pinterest pour TaxiAssur

  Configure Pinterest dans social_networks avec :
  - API Key (déjà présente)
  - Board ID (à ajouter)
  - Auto-publication activée
  - Edge Function pinterest-publisher (déjà déployée)

  ⚠️ IMPORTANT : Remplacez YOUR_BOARD_ID_HERE par le Board ID obtenu

  À exécuter dans Supabase SQL Editor
*/

DO $$
DECLARE
  pinterest_exists BOOLEAN;
  has_api_key BOOLEAN;
BEGIN
  -- Vérifier si Pinterest existe
  SELECT EXISTS (
    SELECT 1 FROM social_networks WHERE platform = 'pinterest'
  ) INTO pinterest_exists;

  IF NOT pinterest_exists THEN
    RAISE NOTICE '❌ Pinterest non trouvé dans social_networks';
    RAISE NOTICE '   Exécutez d''abord FIX-LINKEDIN-PINTEREST-STATUS.sql';
    RETURN;
  END IF;

  -- Vérifier si l'API key existe
  SELECT (config ? 'api_key') INTO has_api_key
  FROM social_networks
  WHERE platform = 'pinterest';

  IF NOT has_api_key THEN
    RAISE NOTICE '⚠️  API Key Pinterest manquante, ajout en cours...';
    UPDATE social_networks
    SET config = config || jsonb_build_object(
      'api_key', 'pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA'
    )
    WHERE platform = 'pinterest';
  END IF;

  -- Ajouter le Board ID dans config
  UPDATE social_networks
  SET
    config = config || jsonb_build_object(
      'board_id', 'YOUR_BOARD_ID_HERE',
      'api_version', 'v5',
      'base_url', 'https://api.pinterest.com/v5'
    ),
    is_active = true,
    is_connected = true,
    auto_publish = true,
    updated_at = now()
  WHERE platform = 'pinterest';

  RAISE NOTICE '✅ Pinterest configuré avec succès !';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT : Remplacez YOUR_BOARD_ID_HERE par votre vrai Board ID !';
  RAISE NOTICE '';
  RAISE NOTICE 'UPDATE social_networks';
  RAISE NOTICE 'SET config = config || jsonb_build_object(''board_id'', ''votre_board_id'')';
  RAISE NOTICE 'WHERE platform = ''pinterest'';';
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
  CASE
    WHEN config ? 'api_key' THEN '✅ API Key présente'
    ELSE '❌ API Key manquante'
  END as api_key_status,
  CASE
    WHEN config->>'board_id' = 'YOUR_BOARD_ID_HERE' THEN '❌ BOARD ID À REMPLACER'
    WHEN config ? 'board_id' THEN '✅ Board ID configuré: ' || (config->>'board_id')
    ELSE '❌ BOARD ID MANQUANT'
  END as board_id_status,
  created_at
FROM social_networks
WHERE platform = 'pinterest';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 PINTEREST PRÊT !';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Platform: pinterest';
  RAISE NOTICE '✅ API Key: Configurée';
  RAISE NOTICE '✅ Edge Function: pinterest-publisher (déjà déployée)';
  RAISE NOTICE '✅ Auto-publish: true';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ÉTAPES SUIVANTES:';
  RAISE NOTICE '   1. Ouvrir le fichier GET-PINTEREST-BOARD-ID.html';
  RAISE NOTICE '   2. Cliquer sur "Récupérer Mes Boards"';
  RAISE NOTICE '   3. Sélectionner un board';
  RAISE NOTICE '   4. Copier le Board ID';
  RAISE NOTICE '   5. Exécuter :';
  RAISE NOTICE '      UPDATE social_networks';
  RAISE NOTICE '      SET config = config || jsonb_build_object(''board_id'', ''votre_board_id'')';
  RAISE NOTICE '      WHERE platform = ''pinterest'';';
  RAISE NOTICE '';
END $$;
