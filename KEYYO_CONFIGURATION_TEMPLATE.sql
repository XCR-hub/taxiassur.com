/*
  Configuration Keyyo - Template SQL

  INSTRUCTIONS :
  1. Remplacez les valeurs entre < > par vos vraies informations
  2. Exécutez ce script dans Supabase SQL Editor
  3. Testez la connexion depuis le CRM
*/

-- ========================================
-- ÉTAPE 1 : Configuration des identifiants API
-- ========================================

UPDATE telephony_providers
SET
  is_active = true,
  config = jsonb_build_object(
    'api_key', '<VOTRE_CLE_API_KEYYO>',           -- Ex: 'kyy_abc123def456...'
    'account_id', '<VOTRE_ACCOUNT_ID>',           -- Ex: '12345'
    'base_url', 'https://api.keyyo.com/v1',       -- Confirmez l'URL
    'click_to_call_enabled', true,                -- Activé par défaut
    'auto_fetch_recordings', true,                -- Récupération auto des enregistrements
    'recording_retention_days', 90,               -- Durée de rétention en jours
    'sync_interval_minutes', 15                   -- Fréquence de sync (15 min)
  ),
  updated_at = now()
WHERE name = 'keyyo';

-- Vérifier que la configuration a bien été appliquée
SELECT
  name,
  is_active,
  config->>'api_key' as api_key_configured,
  config->>'account_id' as account_id_configured,
  config->>'base_url' as base_url
FROM telephony_providers
WHERE name = 'keyyo';


-- ========================================
-- ÉTAPE 2 : Association des extensions aux utilisateurs
-- ========================================

-- IMPORTANT : Pour chaque commercial, vous devez :
-- 1. Connaître son user_id dans le CRM (UUID)
-- 2. Connaître son extension Keyyo (ex: 101, 102, etc.)
-- 3. Optionnel : Son numéro de téléphone direct

-- Méthode 1 : Trouver les user_id depuis les emails
-- (Décommentez et exécutez pour voir les IDs)
/*
SELECT
  id as user_id,
  email,
  role,
  created_at
FROM admin_users
WHERE role = 'commercial' OR role = 'admin'
ORDER BY email;
*/

-- Méthode 2 : Associer les extensions (un par un)
-- Template pour chaque utilisateur :

/*
-- Utilisateur 1 : martin@taxiassur.com
INSERT INTO telephony_users (user_id, provider_id, extension, phone_number, is_active)
VALUES (
  '<USER_ID_DE_MARTIN>',                                        -- UUID de Martin
  (SELECT id FROM telephony_providers WHERE name = 'keyyo'),    -- ID du provider Keyyo
  '101',                                                        -- Extension Keyyo de Martin
  '+33123456789',                                               -- Téléphone direct (optionnel)
  true                                                          -- Actif
)
ON CONFLICT (user_id, provider_id)
DO UPDATE SET
  extension = EXCLUDED.extension,
  phone_number = EXCLUDED.phone_number,
  is_active = EXCLUDED.is_active,
  updated_at = now();
*/

/*
-- Utilisateur 2 : sophie@taxiassur.com
INSERT INTO telephony_users (user_id, provider_id, extension, phone_number, is_active)
VALUES (
  '<USER_ID_DE_SOPHIE>',
  (SELECT id FROM telephony_providers WHERE name = 'keyyo'),
  '102',
  '+33123456790',
  true
)
ON CONFLICT (user_id, provider_id)
DO UPDATE SET
  extension = EXCLUDED.extension,
  phone_number = EXCLUDED.phone_number,
  is_active = EXCLUDED.is_active,
  updated_at = now();
*/

-- Ajoutez autant de blocs que nécessaire pour chaque commercial


-- Vérifier les associations créées
SELECT
  tu.extension,
  tu.phone_number,
  tu.is_active,
  au.email as user_email,
  au.role,
  tp.name as provider_name
FROM telephony_users tu
JOIN admin_users au ON tu.user_id = au.id
JOIN telephony_providers tp ON tu.provider_id = tp.id
WHERE tp.name = 'keyyo'
ORDER BY tu.extension;


-- ========================================
-- ÉTAPE 3 : Test de configuration
-- ========================================

-- Cette requête vérifie que tout est bien configuré
SELECT
  '✅ Provider configuré' as status,
  COUNT(*) as count
FROM telephony_providers
WHERE name = 'keyyo'
  AND is_active = true
  AND config->>'api_key' IS NOT NULL
  AND config->>'api_key' != ''

UNION ALL

SELECT
  '✅ Extensions configurées' as status,
  COUNT(*) as count
FROM telephony_users tu
JOIN telephony_providers tp ON tu.provider_id = tp.id
WHERE tp.name = 'keyyo'
  AND tu.is_active = true;


-- ========================================
-- ÉTAPE 4 (Optionnel) : Configurer les secrets Supabase
-- ========================================

/*
IMPORTANT : Les identifiants API doivent AUSSI être stockés dans les secrets Supabase
pour être accessibles par les Edge Functions.

Via le Dashboard Supabase :
1. Allez dans Settings → Vault
2. Ajoutez ces secrets :
   - KEYYO_API_KEY = <VOTRE_CLE_API>
   - KEYYO_ACCOUNT_ID = <VOTRE_ACCOUNT_ID>
   - KEYYO_BASE_URL = https://api.keyyo.com/v1

OU via la CLI Supabase :
supabase secrets set KEYYO_API_KEY=REDACTED
supabase secrets set KEYYO_ACCOUNT_ID="<VOTRE_ACCOUNT_ID>"
supabase secrets set KEYYO_BASE_URL="https://api.keyyo.com/v1"
*/


-- ========================================
-- ÉTAPE 5 : Configuration du Webhook (si supporté)
-- ========================================

/*
Si Keyyo supporte les webhooks, configurez dans l'interface Keyyo :

URL du webhook :
  https://<VOTRE_PROJET>.supabase.co/functions/v1/keyyo-webhook

Événements à activer :
  ✅ call.started      - Début d'appel
  ✅ call.answered     - Appel décroché
  ✅ call.ended        - Fin d'appel
  ✅ recording.ready   - Enregistrement disponible

Méthode HTTP : POST
Content-Type : application/json

Secret du webhook (optionnel mais recommandé) :
  Générez un secret aléatoire et configurez-le :
  - Dans Keyyo : Utilisez ce secret pour signer les requêtes
  - Dans Supabase : Ajoutez le secret KEYYO_WEBHOOK_SECRET

  Ex:
  supabase secrets set KEYYO_WEBHOOK_SECRET=REDACTED
*/


-- ========================================
-- NETTOYAGE (en cas d'erreur)
-- ========================================

-- Si vous devez recommencer la configuration :
/*
-- Désactiver Keyyo
UPDATE telephony_providers
SET is_active = false
WHERE name = 'keyyo';

-- Supprimer les associations d'extensions
DELETE FROM telephony_users
WHERE provider_id = (SELECT id FROM telephony_providers WHERE name = 'keyyo');

-- Réinitialiser la config
UPDATE telephony_providers
SET config = jsonb_build_object(
  'api_key', '',
  'account_id', null,
  'base_url', 'https://api.keyyo.com/v1'
)
WHERE name = 'keyyo';
*/


-- ========================================
-- AIDE : Commandes utiles
-- ========================================

-- Voir tous les appels enregistrés
-- SELECT * FROM telephony_calls ORDER BY created_at DESC LIMIT 10;

-- Voir les statistiques d'appels par utilisateur
-- SELECT
--   au.email,
--   COUNT(*) as total_calls,
--   COUNT(*) FILTER (WHERE tc.direction = 'outbound') as appels_sortants,
--   COUNT(*) FILTER (WHERE tc.direction = 'inbound') as appels_entrants,
--   SUM(tc.duration_seconds) / 60 as total_minutes
-- FROM telephony_calls tc
-- JOIN admin_users au ON tc.user_id = au.id
-- GROUP BY au.email;

-- Voir les enregistrements disponibles
-- SELECT
--   tc.lead_id,
--   tc.phone_number,
--   tc.duration_seconds,
--   tr.file_size,
--   tr.download_url
-- FROM telephony_calls tc
-- JOIN telephony_recordings tr ON tc.id = tr.call_id
-- ORDER BY tc.created_at DESC
-- LIMIT 10;
