/*
  # SYSTÈME ULTRA SIMPLE : Direct SMTP sans queue
  
  ## Principe
  1. Nouveau lead → trigger
  2. Trigger appelle send-lead-notification (PERFORM = async)
  3. send-lead-notification envoie via IONOS SMTP
  4. RAPIDE, SIMPLE, FIABLE
*/

-- Supprimer TOUS les triggers conflictuels
DROP TRIGGER IF EXISTS trigger_notify_new_lead ON crm_leads;
DROP TRIGGER IF EXISTS trg_send_lead_notification ON crm_leads;
DROP TRIGGER IF EXISTS trg_crm_leads_after_insert ON crm_leads;

-- Une seule fonction simple
CREATE OR REPLACE FUNCTION send_lead_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_payload jsonb;
BEGIN
  -- Nom complet
  v_full_name := COALESCE(NEW.full_name, TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')));
  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := 'Prospect';
  END IF;

  -- Payload
  v_payload := jsonb_build_object(
    'lead_id', NEW.id::text,
    'name', v_full_name,
    'email', COALESCE(NEW.email, ''),
    'phone', COALESCE(NEW.phone, ''),
    'city', COALESCE(NEW.city, ''),
    'status', COALESCE(NEW.status::text, 'new'),
    'immatriculation', COALESCE(NEW.metadata->>'immatriculation', ''),
    'access_token', NEW.access_token
  );

  -- FIRE AND FORGET (PERFORM = pas d'attente)
  BEGIN
    PERFORM net.http_post(
      url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-lead-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg'
      ),
      body := v_payload::text
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ne jamais bloquer l'insertion
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- UN SEUL trigger
CREATE TRIGGER trg_send_emails_after_insert
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION send_lead_email_notification();

COMMENT ON FUNCTION send_lead_email_notification() IS 
'Système simple : appelle send-lead-notification via IONOS SMTP en mode asynchrone (PERFORM)';
