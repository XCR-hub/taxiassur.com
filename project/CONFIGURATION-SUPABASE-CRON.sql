-- ============================================================================
-- CONFIGURATION SUPABASE POUR PG_CRON
-- ============================================================================
-- À exécuter dans SQL Editor après avoir activé pg_cron
-- Ces paramètres permettent aux cron jobs d'appeler les Edge Functions

-- 1. Configurer l'URL Supabase
ALTER DATABASE postgres SET app.supabase_url TO 'https://drohhxrkoequjphvabvq.supabase.co';

-- 2. Configurer la clé service role
-- REMPLACER la valeur ci-dessous par votre vraie clé service_role_key complète
ALTER DATABASE postgres SET app.supabase_service_role_key TO 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyODA5MzU0MCwiZXhwIjoyMDQzNjY5NTQwfQ.VOTRE_CLE_COMPLETE_ICI';

-- 3. Recharger la configuration
SELECT pg_reload_conf();

-- 4. Vérifier que les paramètres sont bien configurés
SELECT
  name,
  setting,
  CASE
    WHEN name = 'app.supabase_service_role_key' THEN LEFT(setting, 20) || '...' || RIGHT(setting, 20)
    ELSE setting
  END as display_value
FROM pg_settings
WHERE name LIKE 'app.supabase%';

-- ============================================================================
-- NOTES IMPORTANTES
-- ============================================================================

/*
TROUVER VOTRE SERVICE_ROLE_KEY :

1. Aller dans : Project Settings (⚙️ en bas à gauche)
2. Cliquer sur : API
3. Copier la valeur de : "service_role" (secret key)
   ⚠️ ATTENTION : C'est la clé "service_role", PAS la clé "anon" !

La clé commence par : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

4. Remplacer la valeur complète dans la commande ALTER DATABASE ci-dessus

POURQUOI CES PARAMÈTRES ?

Les cron jobs ont besoin de ces paramètres pour :
- Connaître l'URL de base de votre projet Supabase
- S'authentifier avec la clé service_role pour appeler les Edge Functions
- Exécuter les automatisations en mode privilégié

SÉCURITÉ :

Ces paramètres sont stockés dans la base de données PostgreSQL et ne sont
accessibles qu'aux superutilisateurs. Les cron jobs s'exécutent avec les
privilèges appropriés pour accéder à ces valeurs.
*/
