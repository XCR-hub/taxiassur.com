/*
  # Correction complete du systeme de queue de notifications

  ## Probleme identifie
  - La fonction queue_event_notifications insere dans crm_event_notifications au lieu de crm_notification_queue
  - Le trigger on_new_lead_created appelle avec 'new_lead' mais la logique n'existe pas
  - Aucune notification n'est reellement mise en queue pour envoi

  ## Corrections
  1. Drop et recree queue_event_notifications pour utiliser crm_notification_queue
  2. Ajoute gestion de l'evenement 'new_lead' 
  3. Appelle send-lead-notification via pg_net pour envoi immediat
*/

-- Drop existing functions first
DROP FUNCTION IF EXISTS queue_event_notifications(uuid, text, jsonb);
DROP FUNCTION IF EXISTS queue_notification(uuid, text, text, text, jsonb, integer, timestamptz);

-- ================================================================
-- 1. FONCTION: Queue une notification (corrigee)
-- ================================================================

CREATE OR REPLACE FUNCTION queue_notification(
  p_lead_id uuid,
  p_channel text,
  p_recipient_type text,
  p_template_id text,
  p_variables jsonb DEFAULT '{}',
  p_priority integer DEFAULT 5,
  p_scheduled_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
  v_lead record;
  v_recipient_email text;
  v_recipient_phone text;
BEGIN
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id;
  
  IF v_lead IS NULL THEN
    RAISE NOTICE 'Lead not found: %', p_lead_id;
    RETURN NULL;
  END IF;
  
  IF p_recipient_type = 'client' THEN
    v_recipient_email := v_lead.email;
    v_recipient_phone := v_lead.phone;
  ELSIF p_recipient_type = 'team' THEN
    v_recipient_email := 'team@taxiassur.com';
    v_recipient_phone := '+33180855786';
  ELSE
    v_recipient_email := NULL;
    v_recipient_phone := NULL;
  END IF;
  
  INSERT INTO crm_notification_queue (
    lead_id, 
    channel, 
    recipient_type, 
    template_id,
    recipient_email, 
    recipient_phone,
    variables, 
    priority, 
    scheduled_at,
    status
  ) VALUES (
    p_lead_id, 
    p_channel, 
    p_recipient_type, 
    p_template_id,
    v_recipient_email,
    v_recipient_phone,
    p_variables, 
    p_priority, 
    p_scheduled_at,
    'pending'
  )
  RETURNING id INTO v_notification_id;
  
  RAISE NOTICE 'Notification queued: id=%, template=%, channel=%', v_notification_id, p_template_id, p_channel;
  
  RETURN v_notification_id;
END;
$$;

-- ================================================================
-- 2. FONCTION: Queue notifications multicanales pour un event (CORRIGEE)
-- ================================================================

CREATE OR REPLACE FUNCTION queue_event_notifications(
  p_lead_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_variables jsonb;
  v_upload_link text;
BEGIN
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id;
  
  IF v_lead IS NULL THEN
    RAISE NOTICE 'queue_event_notifications: Lead not found %', p_lead_id;
    RETURN;
  END IF;
  
  v_upload_link := 'https://taxiassur.com/espace-prospect/' || COALESCE(v_lead.access_token, '');
  
  v_variables := jsonb_build_object(
    'first_name', COALESCE(v_lead.first_name, 'Client'),
    'last_name', COALESCE(v_lead.last_name, ''),
    'full_name', COALESCE(v_lead.full_name, v_lead.first_name || ' ' || COALESCE(v_lead.last_name, '')),
    'email', COALESCE(v_lead.email, ''),
    'phone', COALESCE(v_lead.phone, ''),
    'city', COALESCE(v_lead.city, ''),
    'access_token', COALESCE(v_lead.access_token, ''),
    'upload_link', v_upload_link,
    'prospect_space_url', v_upload_link
  ) || COALESCE(p_event_data, '{}'::jsonb);
  
  RAISE NOTICE 'queue_event_notifications: event=%, lead=%, email=%', p_event_type, p_lead_id, v_lead.email;
  
  CASE p_event_type
    WHEN 'new_lead', 'lead_created' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'welcome_lead', v_variables, 1, now());
      PERFORM queue_notification(p_lead_id, 'email', 'team', 'new_lead_alert', v_variables, 1, now());
      
    WHEN 'document_uploaded', 'document_received' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'document_received', v_variables, 3, now());
      
    WHEN 'documents_complete' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'documents_complete', v_variables, 2, now());
      PERFORM queue_notification(p_lead_id, 'email', 'team', 'new_lead_alert', v_variables, 1, now());
      
    WHEN 'quote_sent' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'quote_available', v_variables, 1, now());
      IF v_lead.consent_sms THEN
        PERFORM queue_notification(p_lead_id, 'sms', 'client', 'quote_available_sms', v_variables, 2, now() + interval '5 minutes');
      END IF;
      
    WHEN 'quote_accepted' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'quote_available', v_variables, 1, now());
      PERFORM queue_notification(p_lead_id, 'email', 'team', 'new_lead_alert', v_variables, 1, now());
      
    WHEN 'signature_sent' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'signature_ready', v_variables, 1, now());
      
    WHEN 'contract_signed' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'welcome_client', v_variables, 1, now());
      PERFORM queue_notification(p_lead_id, 'email', 'team', 'new_lead_alert', v_variables, 1, now());
      
    WHEN 'payment_completed' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'payment_confirmation', v_variables, 1, now());
      PERFORM queue_notification(p_lead_id, 'email', 'team', 'new_lead_alert', v_variables, 1, now());
      
    ELSE
      RAISE NOTICE 'Unknown event type: %', p_event_type;
  END CASE;
  
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    message,
    priority,
    context_data,
    created_at
  ) VALUES (
    p_lead_id,
    p_event_type,
    format('Event %s for lead %s %s', p_event_type, v_lead.first_name, v_lead.last_name),
    CASE WHEN p_event_type IN ('new_lead', 'lead_created') THEN 10 ELSE 5 END,
    v_variables,
    NOW()
  );
END;
$$;

-- ================================================================
-- 3. TRIGGER: Nouveau lead cree (CORRIGE pour appeler edge function)
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
  IF NEW.access_token IS NULL OR NEW.access_token = '' THEN
    NEW.access_token := encode(sha256((NEW.id::text || COALESCE(NEW.email, '') || random()::text)::bytea), 'hex');
  END IF;

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
    RAISE NOTICE 'Edge function call failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ================================================================
-- 4. Recreer le trigger (BEFORE INSERT pour pouvoir modifier NEW.access_token)
-- ================================================================

DROP TRIGGER IF EXISTS trg_new_lead_created ON crm_leads;
CREATE TRIGGER trg_new_lead_created
  BEFORE INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION on_new_lead_created();
