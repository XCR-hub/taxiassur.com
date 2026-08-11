/*
  # Correction du statut dans le processeur de queue
  
  1. Changement
    - 'processing' → 'sending' (conforme à la contrainte existante)
*/

-- Corriger la fonction avec le bon statut
CREATE OR REPLACE FUNCTION process_email_queue_simple(batch_size int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  processed_count int := 0;
  failed_count int := 0;
  email_rec record;
  response_id bigint;
BEGIN
  RAISE LOG '📧 [PROCESSOR] Début traitement queue (batch_size: %)', batch_size;
  
  -- Traiter les emails en attente
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
      
      -- Marquer comme en envoi (CORRECTION: 'sending' au lieu de 'processing')
      UPDATE email_queue 
      SET status = 'sending', retry_count = retry_count + 1
      WHERE id = email_rec.id;
      
      -- Appeler l'Edge Function IONOS
      SELECT net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email-ionos',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT'
        ),
        body := jsonb_build_object(
          'to', email_rec.to_email,
          'toName', email_rec.to_name,
          'subject', email_rec.subject,
          'html', email_rec.body,
          'from', email_rec.from_email,
          'fromName', email_rec.from_name
        ),
        timeout_milliseconds := 10000
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
      -- Marquer comme échoué après max_retries tentatives
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
$$;
