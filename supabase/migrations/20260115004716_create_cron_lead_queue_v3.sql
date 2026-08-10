/*
  # CRON : Traiter la queue d'emails toutes les minutes
  
  Appelle process-lead-queue qui envoie les emails via IONOS SMTP
*/

-- Vérifier si le job existe déjà et le supprimer
DO $$
BEGIN
  PERFORM cron.unschedule('process-lead-email-queue');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Créer le cron (toutes les minutes)
SELECT cron.schedule(
  'process-lead-email-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/process-lead-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT'
    ),
    body := '{}'::jsonb
  );
  $$
);
