/*
  # SYSTÈME ULTRA RAPIDE : Queue sans appel HTTP
  
  ## Le problème
  - net.http_post BLOQUE le trigger même avec PERFORM
  - La page reste bloquée pendant l'envoi
  
  ## La solution
  1. Trigger → INSERT dans notification_queue (0.001s)
  2. Page merci s'affiche instantanément
  3. Cron traite la queue toutes les minutes
  
  CETTE MÉTHODE EST 1000x PLUS RAPIDE !
*/

-- Supprimer le trigger qui bloque
DROP TRIGGER IF EXISTS trg_send_emails_after_insert ON crm_leads;

-- Fonction ultra-rapide : juste une INSERT
CREATE OR REPLACE FUNCTION queue_lead_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
BEGIN
  -- Nom complet
  v_full_name := COALESCE(NEW.full_name, TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')));
  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := 'Prospect';
  END IF;

  -- Email équipe TaxiAssur
  INSERT INTO notification_queue (
    lead_id, channel, recipient, template_key, priority, status, variables, scheduled_for
  ) VALUES (
    NEW.id, 'email', 'team@taxiassur.com', 'new_lead_team', 'high', 'pending',
    jsonb_build_object(
      'lead_name', v_full_name,
      'lead_email', COALESCE(NEW.email, ''),
      'lead_phone', COALESCE(NEW.phone, ''),
      'lead_city', COALESCE(NEW.city, ''),
      'lead_id', NEW.id::text,
      'access_token', NEW.access_token
    ),
    NOW()
  );

  -- Email commercial XCR
  INSERT INTO notification_queue (
    lead_id, channel, recipient, template_key, priority, status, variables, scheduled_for
  ) VALUES (
    NEW.id, 'email', 'commercial@xcr.fr', 'new_lead_team', 'high', 'pending',
    jsonb_build_object(
      'lead_name', v_full_name,
      'lead_email', COALESCE(NEW.email, ''),
      'lead_phone', COALESCE(NEW.phone, ''),
      'lead_city', COALESCE(NEW.city, ''),
      'lead_id', NEW.id::text,
      'access_token', NEW.access_token
    ),
    NOW()
  );

  -- Email prospect
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    INSERT INTO notification_queue (
      lead_id, channel, recipient, template_key, priority, status, variables, scheduled_for
    ) VALUES (
      NEW.id, 'email', NEW.email, 'new_lead_prospect', 'high', 'pending',
      jsonb_build_object(
        'lead_name', v_full_name,
        'first_name', COALESCE(NEW.first_name, v_full_name),
        'access_token', NEW.access_token,
        'upload_link', 'https://taxiassur.com/espace-prospect/' || NEW.access_token
      ),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger AFTER (ne bloque pas)
CREATE TRIGGER trg_queue_notifications
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_lead_notifications();

COMMENT ON FUNCTION queue_lead_notifications() IS 
'Ultra rapide : insère dans notification_queue, le cron traite toutes les minutes';
