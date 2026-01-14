/*
  # Correction du trigger pour AFTER INSERT

  ## Probleme
  - Le trigger BEFORE INSERT ne peut pas referencer NEW.id car la ligne n'existe pas encore
  - On doit separer la generation du token (BEFORE) des notifications (AFTER)
*/

-- ================================================================
-- 1. Trigger pour generer le token (BEFORE INSERT)
-- ================================================================

CREATE OR REPLACE FUNCTION generate_crm_lead_access_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.access_token IS NULL OR NEW.access_token = '' THEN
    NEW.access_token := encode(sha256((gen_random_uuid()::text || COALESCE(NEW.email, '') || random()::text)::bytea), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_leads_access_token ON crm_leads;
CREATE TRIGGER trg_crm_leads_access_token
  BEFORE INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION generate_crm_lead_access_token();

-- ================================================================
-- 2. Trigger pour les notifications (AFTER INSERT)
-- ================================================================

CREATE OR REPLACE FUNCTION on_new_lead_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id bigint;
  v_supabase_url text;
  v_service_key text;
BEGIN
  INSERT INTO crm_automation_events (lead_id, event_type, event_data, new_status)
  VALUES (NEW.id, 'new_lead', jsonb_build_object('source', NEW.source, 'created_at', now()), NEW.status::text);

  PERFORM queue_event_notifications(NEW.id, 'new_lead', jsonb_build_object('source', NEW.source));

  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_key := current_setting('app.settings.service_role_key', true);
    
    IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/send-lead-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
          'lead_id', NEW.id,
          'name', COALESCE(NEW.full_name, NEW.first_name || ' ' || COALESCE(NEW.last_name, '')),
          'email', NEW.email,
          'phone', NEW.phone,
          'city', COALESCE(NEW.city, ''),
          'status', COALESCE((NEW.metadata->>'vehicle_type')::text, 'taxi'),
          'access_token', NEW.access_token
        )
      ) INTO v_request_id;
      
      RAISE NOTICE 'send-lead-notification called, request_id=%', v_request_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Edge function call failed (non-blocking): %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_lead_created ON crm_leads;
CREATE TRIGGER trg_new_lead_created
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION on_new_lead_created();
