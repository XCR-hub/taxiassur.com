-- ============================================================================
-- ÉTAPE 2 : CONFIGURATION PG_CRON
-- ============================================================================
-- À exécuter dans SQL Editor après avoir activé pg_cron (Étape 1)
-- Copier-coller ces 3 commandes et cliquer sur "Run"

-- 1. Configurer l'URL Supabase
ALTER DATABASE postgres SET app.supabase_url TO 'https://drohhxrkoequjphvabvq.supabase.co';

-- 2. Configurer la clé service_role (VOTRE CLÉ EST DÉJÀ INTÉGRÉE)
ALTER DATABASE postgres SET app.supabase_service_role_key TO 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik';

-- 3. Recharger la configuration PostgreSQL
SELECT pg_reload_conf();

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
-- Exécutez cette requête pour confirmer que tout est bien configuré

SELECT
  name,
  CASE
    WHEN name = 'app.supabase_service_role_key'
    THEN LEFT(setting, 30) || '...' || RIGHT(setting, 30)
    ELSE setting
  END as value
FROM pg_settings
WHERE name LIKE 'app.supabase%';

-- ============================================================================
-- RÉSULTAT ATTENDU :
-- ============================================================================
/*
name                          | value
------------------------------|------------------------------------------
app.supabase_url              | https://drohhxrkoequjphvabvq.supabase.co
app.supabase_service_role_key | eyJhbGciOiJIUzI1NiIsInR5cCI6...Ds4ik
*/

-- ✅ Si vous voyez ces 2 lignes, passez à l'ÉTAPE 3 !
