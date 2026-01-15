/*
  # FIX : Utiliser la bonne table crm_notification_queue
  
  Le système fonctionnel utilise crm_notification_queue, pas notification_queue
*/

CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
BEGIN
  -- Construire le nom complet
  v_full_name := COALESCE(NEW.full_name, TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')));
  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := 'Prospect';
  END IF;

  -- Email équipe interne
  INSERT INTO crm_notification_queue (
    lead_id, 
    channel, 
    recipient_type, 
    template_id, 
    priority, 
    variables,
    status,
    scheduled_at
  ) VALUES (
    NEW.id, 
    'email', 
    'team', 
    'new_lead_commercial', 
    'high',
    jsonb_build_object(
      'lead_name', v_full_name,
      'lead_email', NEW.email, 
      'lead_phone', COALESCE(NEW.phone, ''), 
      'lead_city', COALESCE(NEW.city, ''),
      'lead_id', NEW.id::text,
      'access_token', NEW.access_token
    ),
    'pending',
    NOW()
  );
  
  -- Email prospect
  INSERT INTO crm_notification_queue (
    lead_id, 
    channel, 
    recipient_type, 
    template_id, 
    priority, 
    variables,
    status,
    scheduled_at
  ) VALUES (
    NEW.id, 
    'email', 
    'prospect', 
    'new_lead_confirmation', 
    'high',
    jsonb_build_object(
      'lead_name', v_full_name,
      'first_name', COALESCE(NEW.first_name, v_full_name),
      'access_token', NEW.access_token,
      'upload_link', 'https://taxiassur.com/espace-prospect/' || NEW.access_token
    ),
    'pending',
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- S'assurer que le trigger est actif
DROP TRIGGER IF EXISTS trigger_notify_new_lead ON crm_leads;
CREATE TRIGGER trigger_notify_new_lead
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();
