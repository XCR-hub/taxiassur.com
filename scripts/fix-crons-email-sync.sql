/*
  Script SQL pour corriger les crons de synchronisation des emails

  À exécuter avec les permissions admin Supabase
  Date: 3 février 2026

  Ce script va :
  1. Désactiver les crons en doublon
  2. Corriger les crons existants pour utiliser get_system_setting()
  3. Optimiser les fréquences d'exécution
*/

-- ============================================
-- ÉTAPE 1: Désactiver les crons en doublon
-- ============================================

UPDATE cron.job
SET active = false
WHERE jobid IN (
  446, -- Ancien process-lead-queue avec URL hardcodée
  451, -- Doublon auto_sync_emails_complete
  452, -- auto-process-email-attachments (sera géré par le principal)
  453  -- auto-create-leads-from-emails (sera géré par le principal)
);

-- Vérification
SELECT jobid, schedule, active, LEFT(command, 80) as command_preview
FROM cron.job
WHERE jobid IN (446, 451, 452, 453);

-- ============================================
-- ÉTAPE 2: Corriger le cron principal de sync emails (450)
-- ============================================

UPDATE cron.job
SET
  schedule = '*/2 * * * *', -- Toutes les 2 minutes
  active = true,
  command = $$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/sync-all-emails-complete',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := jsonb_build_object('limit', 50, 'parse_forms', true),
  timeout_milliseconds := 180000
) as request_id;
$$
WHERE jobid = 450;

-- Vérification
SELECT jobid, schedule, active, LEFT(command, 80)
FROM cron.job
WHERE jobid = 450;

-- ============================================
-- ÉTAPE 3: Corriger le cron de parsing formulaires (455)
-- ============================================

UPDATE cron.job
SET
  schedule = '*/3 * * * *', -- Toutes les 3 minutes
  active = true,
  command = $$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/parse-form-emails-create-leads',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := jsonb_build_object('limit', 20),
  timeout_milliseconds := 90000
) as request_id;
$$
WHERE jobid = 455;

-- Vérification
SELECT jobid, schedule, active, LEFT(command, 80)
FROM cron.job
WHERE jobid = 455;

-- ============================================
-- ÉTAPE 4: Corriger le cron process-lead-queue (447)
-- ============================================

UPDATE cron.job
SET
  command = $$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/process-lead-queue',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_anon_key')),
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 10000
) AS request_id;
$$
WHERE jobid = 447;

-- Vérification
SELECT jobid, schedule, active, LEFT(command, 80)
FROM cron.job
WHERE jobid = 447;

-- ============================================
-- ÉTAPE 5: Vérification globale
-- ============================================

-- Voir tous les crons actifs liés aux emails et leads
SELECT
  jobid,
  schedule,
  active,
  nodename,
  LEFT(command, 100) as command_preview
FROM cron.job
WHERE active = true
  AND (command LIKE '%email%' OR command LIKE '%lead%' OR command LIKE '%parse%')
ORDER BY jobid;

-- ============================================
-- ÉTAPE 6: Tester manuellement (optionnel)
-- ============================================

-- Tester la synchronisation manuelle
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/sync-all-emails-complete',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := jsonb_build_object('limit', 50, 'force', true),
  timeout_milliseconds := 180000
);

-- Vérifier le résultat
SELECT COUNT(*) as total_emails,
       MAX(created_at) as last_sync
FROM email_messages;

-- ============================================
-- NOTES IMPORTANTES
-- ============================================

/*
  FRÉQUENCES OPTIMISÉES:
  - Sync emails: Toutes les 2 minutes (réduit de 1 min pour éviter la surcharge)
  - Parse formulaires: Toutes les 3 minutes
  - Process queue: Toutes les 30 secondes (inchangé)

  TIMEOUTS:
  - Sync emails: 180 secondes (3 minutes)
  - Parse formulaires: 90 secondes
  - Process queue: 10 secondes

  DÉSACTIVÉS (doublons):
  - Cron 446: Ancien process-lead-queue hardcodé
  - Cron 451: Doublon sync emails (fonction directe)
  - Cron 452: Process attachments (géré par 450)
  - Cron 453: Create leads from emails (géré par 455)
*/
