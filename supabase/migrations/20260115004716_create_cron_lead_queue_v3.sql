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
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik'
    ),
    body := '{}'::jsonb
  );
  $$
);
