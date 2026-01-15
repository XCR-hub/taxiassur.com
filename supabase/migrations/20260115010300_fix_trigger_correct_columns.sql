/*
  # Corriger le trigger avec les bonnes colonnes
  
  1. Fonction corrigée
    - Utilise "variables" au lieu de "data"
    - Ajoute "channel" (email)
*/

-- Fonction ultra-rapide corrigée
CREATE OR REPLACE FUNCTION trg_fast_queue_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Notification prospect
  INSERT INTO notification_queue (lead_id, channel, recipient, template_key, variables)
  VALUES (
    NEW.id,
    'email',
    NEW.email,
    'new_lead_prospect',
    jsonb_build_object(
      'full_name', NEW.full_name,
      'email', NEW.email,
      'access_token', NEW.access_token
    )
  );
  
  -- Notification équipe team@taxiassur.com
  INSERT INTO notification_queue (lead_id, channel, recipient, template_key, variables)
  VALUES (
    NEW.id,
    'email',
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
    INSERT INTO notification_queue (lead_id, channel, recipient, template_key, variables)
    SELECT 
      NEW.id,
      'email',
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
    INSERT INTO notification_queue (lead_id, channel, recipient, template_key, variables)
    VALUES (
      NEW.id,
      'email',
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
