/*
  # Fix Trigger Default Status

  ## Problem
  The trigger `on_new_lead_created_unified` sends 'new' as default status
  but the enum `lead_status` expects 'NEW_LEAD'

  ## Solution
  Update the trigger to use 'NEW_LEAD' instead of 'new'
*/

CREATE OR REPLACE FUNCTION on_new_lead_created_unified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id bigint;
  v_full_name text;
  v_payload jsonb;
  v_upload_link text;
  v_variables jsonb;
BEGIN
  -- 1. Générer access_token si pas défini
  IF NEW.access_token IS NULL OR NEW.access_token = '' THEN
    NEW.access_token := encode(sha256((NEW.id::text || COALESCE(NEW.email, '') || extract(epoch from now())::text)::bytea), 'hex');
  END IF;

  -- 2. Construire le nom complet
  v_full_name := COALESCE(NEW.full_name, TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')));
  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := 'Prospect';
  END IF;

  -- 3. Construire le lien d'upload
  v_upload_link := 'https://taxiassur.com/espace-prospect/' || NEW.access_token;

  -- 4. Variables pour les templates
  v_variables := jsonb_build_object(
    'first_name', COALESCE(NEW.first_name, 'Client'),
    'last_name', COALESCE(NEW.last_name, ''),
    'full_name', v_full_name,
    'email', COALESCE(NEW.email, ''),
    'phone', COALESCE(NEW.phone, ''),
    'city', COALESCE(NEW.city, ''),
    'access_token', NEW.access_token,
    'upload_link', v_upload_link,
    'prospect_space_url', v_upload_link,
    'source', NEW.source
  );

  -- 5. Insérer dans crm_automation_events
  INSERT INTO crm_automation_events (lead_id, event_type, event_data, new_status)
  VALUES (NEW.id, 'new_lead', jsonb_build_object('source', NEW.source, 'created_at', now()), NEW.status::text);

  -- 6. Queue les notifications via la fonction queue_event_notifications
  BEGIN
    PERFORM queue_event_notifications(NEW.id, 'new_lead', jsonb_build_object('source', NEW.source));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'queue_event_notifications failed: %', SQLERRM;
  END;

  -- 7. Insérer une notification pour l'admin dans crm_event_notifications
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    message,
    priority,
    context_data,
    created_at
  ) VALUES (
    NEW.id,
    'new_lead',
    format('Nouveau lead: %s (%s) - %s', v_full_name, NEW.email, COALESCE(NEW.city, '')),
    10,
    v_variables,
    NOW()
  );

  -- 8. Appeler l'edge function send-lead-notification pour envoi immédiat des emails
  BEGIN
    v_payload := jsonb_build_object(
      'lead_id', NEW.id::text,
      'name', v_full_name,
      'email', COALESCE(NEW.email, ''),
      'phone', COALESCE(NEW.phone, ''),
      'city', COALESCE(NEW.city, ''),
      'status', COALESCE(NEW.status::text, 'NEW_LEAD'),
      'immatriculation', COALESCE(NEW.metadata->>'immatriculation', ''),
      'access_token', NEW.access_token
    );

    SELECT net.http_post(
      url := 'https://zzwqkjpafrsaanfbjigz.supabase.co/functions/v1/send-lead-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d3FranBhZnJzYWFuZmJqaWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMTU3ODksImV4cCI6MjA1MDg5MTc4OX0.j3wXfOlPfqKNsYTIpubtCCmPa15vxHVa87K6yJR-YRE'
      ),
      body := v_payload::text
    ) INTO v_request_id;

    RAISE NOTICE '✅ EMAIL NOTIFICATION SENT: lead=%, name=%, email=%, request_id=%', NEW.id, v_full_name, NEW.email, v_request_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ EMAIL NOTIFICATION FAILED: lead=%, email=%, error=%', NEW.id, NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION on_new_lead_created_unified() IS
  'Fonction unifiée - FIX: Use NEW_LEAD instead of new as default status';
