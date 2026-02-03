/*
  # Fix notification trigger column name

  1. Problem
    - Trigger uses `notification_type` but table has `event_type`
    - Trigger uses `title` but table doesn't have it
    - Trigger uses wrong column names

  2. Solution
    - Update trigger to use correct column names
    - Map to existing crm_event_notifications structure
*/

-- Drop the incorrectly created trigger
DROP TRIGGER IF EXISTS trigger_notify_new_lead ON crm_leads;
DROP FUNCTION IF EXISTS notify_new_lead();

-- Create correct function that matches the actual table structure
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification with correct column names
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
    10, -- Priority high
    jsonb_build_object(
      'lead_id', NEW.id,
      'email', NEW.email,
      'phone', NEW.phone,
      'status', NEW.status,
      'created_at', NEW.created_at,
      'action_url', '/backoffice/crm/lead/' || NEW.id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_notify_new_lead
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

-- Also fix the status change trigger
DROP TRIGGER IF EXISTS trigger_notify_lead_status_change ON crm_leads;
DROP FUNCTION IF EXISTS notify_lead_status_change();

CREATE OR REPLACE FUNCTION notify_lead_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_priority integer := 5; -- medium
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
      -- Don't notify for other status changes
      RETURN NEW;
  END CASE;

  -- Insert notification
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
      'action_url', '/backoffice/crm/lead/' || NEW.id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_lead_status_change
  AFTER UPDATE OF status ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_lead_status_change();

-- Update RPC functions to use correct column names
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE crm_event_notifications
  SET 
    is_read = true
  WHERE id = p_notification_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE crm_event_notifications
  SET 
    is_read = true
  WHERE is_read = false;

  RETURN true;
END;
$$;