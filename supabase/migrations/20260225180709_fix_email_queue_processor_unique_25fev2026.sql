/*
  # Fix Email Queue Processor - Version Unique
  
  Supprime les doublons et crée une seule version propre
*/

-- Supprimer toutes les versions existantes
DROP FUNCTION IF EXISTS process_email_queue_simple(int, int) CASCADE;
DROP FUNCTION IF EXISTS process_email_queue_simple(integer, integer) CASCADE;
DROP FUNCTION IF EXISTS process_email_queue_simple CASCADE;

-- Créer la version unique et propre
CREATE FUNCTION process_email_queue_simple(
  batch_size int DEFAULT 20,
  max_retries int DEFAULT 3
)
RETURNS jsonb AS $$
DECLARE
  processed_count int := 0;
  failed_count int := 0;
  email_rec record;
  response_id bigint;
BEGIN
  RAISE LOG '📧 [PROCESSOR] Début traitement queue (batch_size: %)', batch_size;

  FOR email_rec IN
    SELECT * FROM email_queue
    WHERE status = 'pending'
    AND retry_count < max_retries
    AND scheduled_for <= now()
    ORDER BY priority DESC, created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      RAISE LOG '📧 [PROCESSOR] Traitement email % pour %', email_rec.email_type, email_rec.to_email;

      -- Marquer comme en envoi
      UPDATE email_queue 
      SET status = 'sending', retry_count = retry_count + 1
      WHERE id = email_rec.id;

      -- Appeler l'Edge Function IONOS
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email-ionos',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik'
        ),
        body := jsonb_build_object(
          'to', email_rec.to_email,
          'toName', email_rec.to_name,
          'subject', email_rec.subject,
          'html', email_rec.body,
          'from', email_rec.from_email,
          'fromName', email_rec.from_name
        ),
        timeout_milliseconds := 30000
      ) INTO response_id;

      -- Marquer comme envoyé
      UPDATE email_queue 
      SET 
        status = 'sent', 
        sent_at = now(),
        error_message = NULL
      WHERE id = email_rec.id;

      processed_count := processed_count + 1;
      RAISE LOG '✅ [PROCESSOR] Email envoyé: % à % (response_id: %)', email_rec.email_type, email_rec.to_email, response_id;

    EXCEPTION WHEN OTHERS THEN
      -- Marquer comme échoué
      UPDATE email_queue 
      SET 
        status = CASE WHEN retry_count >= max_retries THEN 'failed' ELSE 'pending' END,
        error_message = SQLERRM,
        scheduled_for = CASE 
          WHEN retry_count < max_retries THEN now() + interval '5 minutes'
          ELSE scheduled_for
        END
      WHERE id = email_rec.id;

      failed_count := failed_count + 1;
      RAISE LOG '❌ [PROCESSOR] Erreur envoi email % à %: %', email_rec.email_type, email_rec.to_email, SQLERRM;
    END;
  END LOOP;

  RAISE LOG '✅ [PROCESSOR] Traitement terminé: % envoyés, % échoués', processed_count, failed_count;

  RETURN jsonb_build_object(
    'processed', processed_count,
    'failed', failed_count,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le cron avec la version correcte
SELECT cron.unschedule('process-email-queue-simple');
SELECT cron.schedule(
  'process-email-queue-simple',
  '* * * * *', -- Chaque minute
  $$SELECT process_email_queue_simple(20)$$
);
