/*
  # Cron pour traiter la queue d'emails - 25 Février 2026

  ## Problème identifié
  - La fonction upsert_lead ajoute les emails à la table email_queue
  - La fonction process_email_queue_simple existe pour les traiter
  - MAIS : Aucun cron n'appelle cette fonction !
  - Résultat : Les emails restent dans la queue et ne sont jamais envoyés

  ## Solution
  - Créer un cron qui appelle process_email_queue_simple toutes les minutes
  - Traite jusqu'à 20 emails par batch

  ## Résultat attendu
  - Nouveau lead → Emails ajoutés à la queue → Envoyés en moins d'1 minute
*/

-- 1. Supprimer les anciens crons similaires s'ils existent (ignorer les erreurs si non présents)
DO $$
BEGIN
  PERFORM cron.unschedule('process-email-queue-minute');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('process-notification-queue');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('process-lead-queue');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('process-email-queue');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Créer le cron qui traite la queue d'emails
SELECT cron.schedule(
  'process-email-queue',           -- Nom du cron
  '* * * * *',                     -- Toutes les minutes
  $$
    SELECT process_email_queue_simple(20);
  $$
);

COMMENT ON EXTENSION pg_cron IS
'Cron actif : process-email-queue (toutes les minutes) pour traiter la email_queue via process_email_queue_simple()';
