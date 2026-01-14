/*
  # Fix lead status change trigger

  Corrige le trigger on_lead_status_change pour utiliser les bons statuts de l'enum
*/

CREATE OR REPLACE FUNCTION on_lead_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_type text;
  v_event_data jsonb;
BEGIN
  -- Determine event type based on status change
  CASE NEW.status
    WHEN 'DOCUMENTS_REQUIRED'::lead_status THEN v_event_type := 'documents_requested';
    WHEN 'READY_FOR_QUOTE'::lead_status THEN v_event_type := 'documents_complete';
    WHEN 'QUOTE_SENT'::lead_status THEN v_event_type := 'quote_sent';
    WHEN 'SIGNATURE_PENDING'::lead_status THEN v_event_type := 'contract_ready';
    WHEN 'SIGNED'::lead_status THEN v_event_type := 'contract_signed';
    WHEN 'ACTIVE_CLIENT'::lead_status THEN v_event_type := 'client_activated';
    WHEN 'CLIENT_LOST'::lead_status THEN v_event_type := 'lead_lost';
    ELSE v_event_type := 'status_changed';
  END CASE;

  -- Build event data
  v_event_data := jsonb_build_object(
    'old_status', OLD.status::text,
    'new_status', NEW.status::text,
    'changed_at', now()
  );

  -- Create automation event (only if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_automation_events') THEN
    INSERT INTO crm_automation_events (lead_id, event_type, event_data, old_status, new_status)
    VALUES (NEW.id, v_event_type, v_event_data, OLD.status::text, NEW.status::text);
  END IF;

  -- Queue notifications for significant status changes
  IF v_event_type NOT IN ('status_changed') THEN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'queue_event_notifications') THEN
      PERFORM queue_event_notifications(NEW.id, v_event_type, v_event_data);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
