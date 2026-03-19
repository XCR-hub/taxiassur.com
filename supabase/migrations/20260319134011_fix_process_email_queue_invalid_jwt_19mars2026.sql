/*
  # Fix process_email_queue_simple - Invalid hardcoded JWT

  ## Problem
  The `process_email_queue_simple` function calls `send-email-ionos` with a hardcoded
  service role JWT. This JWT is now invalid (returns 401). Because `net.http_post` is
  fire-and-forget (async), emails are incorrectly marked as "sent" in the queue even
  though they never actually got delivered.

  ## Fix
  1. Replace the hardcoded JWT with `get_system_setting('supabase_service_role_key')`
  2. Reset emails from the last 2 hours that were silently failed (marked "sent" but
     actually returned 401) back to "pending" so they are retried immediately.

  ## Impact
  - All new form submissions will correctly send emails to the prospect and team
  - Recent failed emails will be retried automatically within 1 minute
*/

CREATE OR REPLACE FUNCTION process_email_queue_simple(
  p_batch_size int DEFAULT 20,
  p_max_retries int DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  processed_count int := 0;
  failed_count int := 0;
  email_rec record;
  response_id bigint;
  v_supabase_url text;
  v_service_key text;
BEGIN
  v_supabase_url := get_system_setting('supabase_url');
  v_service_key  := get_system_setting('supabase_service_role_key');

  RAISE LOG '📧 [PROCESSOR] Début traitement queue (batch_size: %)', p_batch_size;

  FOR email_rec IN
    SELECT * FROM email_queue
    WHERE status = 'pending'
    AND retry_count < p_max_retries
    AND scheduled_for <= now()
    ORDER BY priority DESC, created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      RAISE LOG '📧 [PROCESSOR] Traitement email % pour %', email_rec.email_type, email_rec.to_email;

      UPDATE email_queue 
      SET status = 'sending', retry_count = retry_count + 1
      WHERE id = email_rec.id;

      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/send-email-ionos',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
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

      UPDATE email_queue 
      SET 
        status = 'sent', 
        sent_at = now(),
        error_message = NULL
      WHERE id = email_rec.id;

      processed_count := processed_count + 1;
      RAISE LOG '✅ [PROCESSOR] Email envoyé: % à % (response_id: %)', email_rec.email_type, email_rec.to_email, response_id;

    EXCEPTION WHEN OTHERS THEN
      UPDATE email_queue 
      SET 
        status = CASE WHEN retry_count >= p_max_retries THEN 'failed' ELSE 'pending' END,
        error_message = SQLERRM,
        scheduled_for = CASE 
          WHEN retry_count < p_max_retries THEN now() + interval '5 minutes'
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

-- Reset emails from the last 2 hours that were silently "sent" but actually failed
-- due to the invalid JWT (marked as sent but never delivered)
UPDATE email_queue
SET 
  status = 'pending',
  retry_count = 0,
  scheduled_for = now(),
  error_message = NULL,
  sent_at = NULL
WHERE 
  status = 'sent'
  AND sent_at >= now() - interval '2 hours'
  AND email_type IN ('new_lead_client', 'new_lead_team', 'lead_resubmitted_team');
