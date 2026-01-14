/*
  # Fix queue_event_notifications priority type

  1. Changes
    - Drop existing queue_event_notifications function
    - Recreate with correct integer priority values instead of text
    - Use 10 for 'high' priority, 5 for 'normal' priority

  2. Security
    - Maintains existing security model
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS queue_event_notifications(uuid, text, jsonb) CASCADE;

-- Recreate with correct priority types
CREATE OR REPLACE FUNCTION queue_event_notifications(
  lead_id_param UUID,
  event_type_param TEXT,
  context_param JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_rec RECORD;
  notification_message TEXT;
  priority_value INTEGER;
BEGIN
  SELECT
    first_name, last_name, email, phone, current_stage_key
  INTO lead_rec
  FROM crm_leads
  WHERE id = lead_id_param;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  CASE event_type_param
    WHEN 'lead_ready_for_quote' THEN
      notification_message := format('Lead %s %s est prêt pour un devis', lead_rec.first_name, lead_rec.last_name);
      priority_value := 10;
    WHEN 'documents_complete' THEN
      notification_message := format('Documents complets pour %s %s', lead_rec.first_name, lead_rec.last_name);
      priority_value := 10;
    WHEN 'stage_advanced' THEN
      notification_message := format('Lead %s %s avancé vers %s', lead_rec.first_name, lead_rec.last_name, lead_rec.current_stage_key);
      priority_value := 5;
    ELSE
      notification_message := format('Événement %s pour lead %s %s', event_type_param, lead_rec.first_name, lead_rec.last_name);
      priority_value := 5;
  END CASE;

  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    message,
    priority,
    context_data,
    created_at
  ) VALUES (
    lead_id_param,
    event_type_param,
    notification_message,
    priority_value,
    context_param,
    NOW()
  );
END;
$$;