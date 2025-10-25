-- =====================================================
-- ACTIVATION PINTEREST - À EXÉCUTER DANS SUPABASE
-- =====================================================

-- 1️⃣ Activer Pinterest dans social_networks
UPDATE social_networks
SET
  is_active = true,
  is_connected = true,
  access_token = 'pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA',
  config = jsonb_build_object(
    'app_id', '1534523',
    'app_secret', '2aae5684dc5aa6efad09b6f48b7167d159b05b2d'
  ),
  updated_at = now()
WHERE platform = 'pinterest';

-- 2️⃣ Vérifier la configuration
SELECT
  platform,
  is_active,
  is_connected,
  LEFT(access_token, 30) || '...' as token_preview,
  config->>'app_id' as app_id,
  created_at,
  updated_at
FROM social_networks
WHERE platform = 'pinterest';
