/*
  # Système de queue ultra-rapide avec cron immédiat
  
  1. Trigger qui insère dans la queue (instantané)
  2. Le cron process-lead-queue s'exécute toutes les 10 secondes
*/

-- Supprimer l'ancien trigger
DROP TRIGGER IF EXISTS trg_after_insert_lead_brevo ON crm_leads;
DROP FUNCTION IF EXISTS trg_send_lead_email_brevo();

-- Créer un trigger simple qui insère dans la queue
CREATE OR REPLACE FUNCTION trg_queue_lead_emails()
RETURNS TRIGGER AS $$
BEGIN
  -- Email prospect
  INSERT INTO notification_queue (lead_id, channel, recipient, template_key, variables, priority)
  VALUES (
    NEW.id,
    'email',
    NEW.email,
    'new_lead_prospect',
    jsonb_build_object(
      'full_name', NEW.full_name,
      'email', NEW.email,
      'access_token', NEW.access_token
    ),
    'urgent'
  );
  
  -- Email équipe
  INSERT INTO notification_queue (lead_id, channel, recipient, template_key, variables, priority)
  VALUES (
    NEW.id,
    'email',
    'team@taxiassur.com',
    'new_lead_team',
    jsonb_build_object(
      'full_name', NEW.full_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'city', NEW.city,
      'status', NEW.status
    ),
    'urgent'
  );
  
  -- Email commercial
  INSERT INTO notification_queue (lead_id, channel, recipient, template_key, variables, priority)
  VALUES (
    NEW.id,
    'email',
    'commercial@xcr.fr',
    'new_lead_team',
    jsonb_build_object(
      'full_name', NEW.full_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'city', NEW.city,
      'status', NEW.status
    ),
    'urgent'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
CREATE TRIGGER trg_after_insert_queue_emails
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trg_queue_lead_emails();
