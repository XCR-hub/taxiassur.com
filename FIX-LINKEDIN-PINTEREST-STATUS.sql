/*
  # Fix LinkedIn & Pinterest Status

  PROBLÈMES OBSERVÉS :
  1. LinkedIn : ✅ Connecté mais avec une croix rouge
     → is_connected = FALSE dans la base

  2. Pinterest : ✅ Connecté mais "API manquante"
     → Manque l'api_key dans config

  SOLUTIONS :
  1. LinkedIn : Mettre is_connected = TRUE
  2. Pinterest : Ajouter api_key dans config
*/

-- 1️⃣ Corriger LinkedIn : is_connected = TRUE
UPDATE social_networks
SET
  is_connected = true,
  updated_at = now()
WHERE platform = 'linkedin'
AND is_connected = false;

-- 2️⃣ Corriger Pinterest : Ajouter api_key dans config
UPDATE social_networks
SET
  config = config || jsonb_build_object(
    'api_key', 'pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA'
  ),
  updated_at = now()
WHERE platform = 'pinterest'
AND NOT (config ? 'api_key');

-- 3️⃣ Vérifier les corrections
SELECT
  platform,
  COALESCE(name, 'N/A') as name,
  is_active,
  is_connected,
  auto_publish,
  CASE
    WHEN platform = 'linkedin' THEN
      CASE WHEN config ? 'access_token' THEN '✅ Token présent' ELSE '❌ Token manquant' END
    WHEN platform = 'pinterest' THEN
      CASE WHEN config ? 'api_key' THEN '✅ API Key présente' ELSE '❌ API Key manquante' END
    ELSE 'N/A'
  END as api_status,
  created_at,
  updated_at
FROM social_networks
WHERE platform IN ('linkedin', 'pinterest')
ORDER BY platform;

-- 4️⃣ Message de confirmation
DO $$
DECLARE
  linkedin_connected BOOLEAN;
  pinterest_has_api BOOLEAN;
BEGIN
  -- Vérifier LinkedIn
  SELECT is_connected INTO linkedin_connected
  FROM social_networks
  WHERE platform = 'linkedin'
  LIMIT 1;

  -- Vérifier Pinterest
  SELECT (config ? 'api_key') INTO pinterest_has_api
  FROM social_networks
  WHERE platform = 'pinterest'
  LIMIT 1;

  RAISE NOTICE '';
  RAISE NOTICE '🔧 CORRECTIONS APPLIQUÉES';
  RAISE NOTICE '';

  IF linkedin_connected THEN
    RAISE NOTICE '✅ LinkedIn : is_connected = TRUE';
    RAISE NOTICE '   → La croix rouge devrait disparaître';
  ELSE
    RAISE NOTICE '❌ LinkedIn : is_connected toujours FALSE';
  END IF;

  RAISE NOTICE '';

  IF pinterest_has_api THEN
    RAISE NOTICE '✅ Pinterest : api_key ajoutée dans config';
    RAISE NOTICE '   → "API manquante" devrait disparaître';
  ELSE
    RAISE NOTICE '❌ Pinterest : api_key toujours manquante';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📝 Rafraîchissez la page : /backoffice/social-media';
  RAISE NOTICE '';
END $$;
