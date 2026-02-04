/*
  # Fix notification links to use correct CRM route - 2026-02-04
  
  1. Problem
    - Notifications use /backoffice/crm/lead/{id} which doesn't exist
    - Correct route is /backoffice/crm-killer/lead/{id}
  
  2. Solution
    - Update notify_new_lead() function to use correct URL
    - Update notify_lead_status_change() function to use correct URL
*/

-- Fix notify_new_lead function with correct URL
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification with correct action URL
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    message,
    priority,
    context_data
  )
  VALUES (
    NEW.id,
    'new_lead',
    'Nouveau lead: ' || COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, NEW.email),
    10,
    jsonb_build_object(
      'lead_id', NEW.id,
      'email', NEW.email,
      'phone', NEW.phone,
      'status', NEW.status,
      'created_at', NEW.created_at,
      'action_url', '/backoffice/crm-killer/lead/' || NEW.id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix notify_lead_status_change function with correct URL
CREATE OR REPLACE FUNCTION notify_lead_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_priority integer := 5;
  v_message text;
BEGIN
  -- Ignore if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine priority and message based on new status
  CASE NEW.status
    WHEN 'DOCUMENTS_VALIDES' THEN
      v_priority := 10;
      v_message := 'Documents validés pour ' || COALESCE(NEW.first_name, NEW.email);
    WHEN 'ATTENTE_SIGNATURE' THEN
      v_priority := 10;
      v_message := 'En attente de signature: ' || COALESCE(NEW.first_name, NEW.email);
    WHEN 'CLIENT_ACTIF' THEN
      v_priority := 10;
      v_message := 'Nouveau client actif: ' || COALESCE(NEW.first_name, NEW.email);
    WHEN 'CLIENT_LOST' THEN
      v_priority := 5;
      v_message := 'Lead perdu: ' || COALESCE(NEW.first_name, NEW.email);
    ELSE
      RETURN NEW;
  END CASE;

  -- Insert notification with correct action URL
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    message,
    priority,
    context_data
  )
  VALUES (
    NEW.id,
    'status_change',
    v_message,
    v_priority,
    jsonb_build_object(
      'lead_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'action_url', '/backoffice/crm-killer/lead/' || NEW.id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
