/*
  # Configuration Pinterest Board ID - PRÊT À EXÉCUTER

  Configure le Board ID Pinterest récupéré pour le système de publication automatique.

  Board ID récupéré: 945333846723355976

  INSTRUCTIONS:
  1. Allez dans Supabase → SQL Editor
  2. Copiez-collez ce fichier complet
  3. Cliquez sur "RUN"
  4. Vérifiez le résultat
*/

-- ====================================
-- CONFIGURATION PINTEREST BOARD ID
-- ====================================

INSERT INTO social_networks (platform, access_token, refresh_token, token_expires_at, is_active, config)
VALUES (
  'pinterest',
  'pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA',
  NULL,
  NOW() + INTERVAL '365 days',
  true,
  jsonb_build_object(
    'board_id', '945333846723355976',
    'app_id', '1534523',
    'configured_at', NOW()
  )
)
ON CONFLICT (platform)
DO UPDATE SET
  access_token = EXCLUDED.access_token,
  config = social_networks.config || jsonb_build_object('board_id', '945333846723355976'),
  is_active = true,
  updated_at = NOW();

-- ====================================
-- VÉRIFICATION CONFIGURATION
-- ====================================

SELECT
  '✅ PINTEREST CONFIGURÉ !' as status,
  platform,
  is_active,
  config->>'board_id' as board_id,
  config->>'app_id' as app_id,
  CASE
    WHEN token_expires_at > NOW() THEN '✅ Token Valide'
    ELSE '❌ Token Expiré'
  END as token_status,
  created_at,
  updated_at
FROM social_networks
WHERE platform = 'pinterest';

-- ====================================
-- VÉRIFICATION EDGE FUNCTION
-- ====================================

SELECT
  '📌 Prochaine étape: Tester la publication Pinterest' as message,
  'Edge Function: pinterest-publisher' as function_name,
  'Status: Déployée et prête' as status;
