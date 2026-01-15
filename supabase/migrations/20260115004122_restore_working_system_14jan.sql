/*
  # RESTAURATION : Retour au système qui fonctionnait le 14/01
  
  ## Problème
  - Le système fonctionnait parfaitement le 14 janvier matin
  - Les fixes suivants ont tout cassé
  
  ## Système fonctionnel du 14/01
  1. trigger_notify_new_lead → insère dans notification_queue
  2. process-notification-queue (cron toutes les minutes) → traite la queue
  3. SIMPLE, RAPIDE, FIABLE
  
  ## Solution
  - Désactiver trg_crm_leads_after_insert qui bloque tout
  - Laisser trigger_notify_new_lead faire son travail
  - Corriger notify_new_lead pour utiliser les bonnes adresses email
*/

-- Désactiver le trigger qui bloque
DROP TRIGGER IF EXISTS trg_crm_leads_after_insert ON crm_leads;

-- Corriger notify_new_lead avec les bonnes adresses
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Email commercial interne
  INSERT INTO notification_queue (lead_id, channel, recipient, template_key, priority, variables)
  VALUES (
    NEW.id, 
    'email', 
    'team@taxiassur.com', 
    'new_lead_commercial', 
    'high',
    jsonb_build_object(
      'lead_name', COALESCE(NEW.full_name, NEW.first_name || ' ' || NEW.last_name, 'Prospect'),
      'lead_email', NEW.email, 
      'lead_phone', NEW.phone, 
      'lead_city', NEW.city,
      'lead_id', NEW.id,
      'access_token', NEW.access_token
    )
  );
  
  -- Email commercial XCR
  INSERT INTO notification_queue (lead_id, channel, recipient, template_key, priority, variables)
  VALUES (
    NEW.id, 
    'email', 
    'commercial@xcr.fr', 
    'new_lead_commercial', 
    'high',
    jsonb_build_object(
      'lead_name', COALESCE(NEW.full_name, NEW.first_name || ' ' || NEW.last_name, 'Prospect'),
      'lead_email', NEW.email, 
      'lead_phone', NEW.phone, 
      'lead_city', NEW.city,
      'lead_id', NEW.id,
      'access_token', NEW.access_token
    )
  );
  
  -- Email prospect
  INSERT INTO notification_queue (lead_id, channel, recipient, template_key, priority, variables)
  VALUES (
    NEW.id, 
    'email', 
    NEW.email, 
    'new_lead_confirmation', 
    'high',
    jsonb_build_object(
      'lead_name', COALESCE(NEW.full_name, NEW.first_name || ' ' || NEW.last_name, 'Client'),
      'access_token', NEW.access_token,
      'upload_link', 'https://taxiassur.com/espace-prospect/' || NEW.access_token
    )
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

COMMENT ON FUNCTION notify_new_lead() IS 
'Système simple et fiable du 14/01 : insère dans notification_queue, le cron traite toutes les minutes';
