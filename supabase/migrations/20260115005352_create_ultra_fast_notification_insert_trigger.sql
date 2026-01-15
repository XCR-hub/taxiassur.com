/*
  # Trigger ultra-rapide pour les notifications
  
  1. Nouvelle fonction
    - Fait juste un INSERT dans notification_queue
    - AUCUN appel HTTP
    - Retourne immédiatement
  
  2. Nouveau trigger
    - S'exécute AFTER INSERT
    - Ultra-rapide (< 50ms)
  
  3. Le CRON traite ensuite la queue
*/

-- Fonction ultra-rapide qui fait juste un INSERT
CREATE OR REPLACE FUNCTION trg_fast_queue_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Notification prospect
  INSERT INTO notification_queue (lead_id, recipient, template_key, data)
  VALUES (
    NEW.id,
    NEW.email,
    'new_lead_prospect',
    jsonb_build_object(
      'full_name', NEW.full_name,
      'email', NEW.email,
      'access_token', NEW.access_token
    )
  );
  
  -- Notification équipe team@taxiassur.com
  INSERT INTO notification_queue (lead_id, recipient, template_key, data)
  VALUES (
    NEW.id,
    'team@taxiassur.com',
    'new_lead_team',
    jsonb_build_object(
      'full_name', NEW.full_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'city', NEW.city
    )
  );
  
  -- Notification commercial (si assigné)
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notification_queue (lead_id, recipient, template_key, data)
    SELECT 
      NEW.id,
      au.email,
      'new_lead_team',
      jsonb_build_object(
        'full_name', NEW.full_name,
        'email', NEW.email,
        'phone', NEW.phone,
        'city', NEW.city,
        'commercial_name', au.full_name
      )
    FROM admin_users au
    WHERE au.id = NEW.assigned_to;
  ELSE
    -- Sinon notification à commercial@xcr.fr
    INSERT INTO notification_queue (lead_id, recipient, template_key, data)
    VALUES (
      NEW.id,
      'commercial@xcr.fr',
      'new_lead_team',
      jsonb_build_object(
        'full_name', NEW.full_name,
        'email', NEW.email,
        'phone', NEW.phone,
        'city', NEW.city
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger RAPIDE
DROP TRIGGER IF EXISTS trg_fast_notifications ON crm_leads;
CREATE TRIGGER trg_fast_notifications
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trg_fast_queue_notifications();
