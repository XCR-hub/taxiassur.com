/*
  # FIX : Trigger asynchrone - Fire and Forget
  
  ## Problème
  - Le trigger attend la réponse de l'edge function (SELECT INTO)
  - Cela ralentit l'insertion et peut causer des timeouts
  
  ## Solution
  - Utiliser PERFORM au lieu de SELECT INTO
  - Fire and forget : on lance l'appel sans attendre la réponse
  - La page de confirmation sera instantanée
*/

CREATE OR REPLACE FUNCTION on_new_lead_post_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_payload jsonb;
  v_upload_link text;
  v_variables jsonb;
BEGIN
  -- 1. Construire le nom complet
  v_full_name := COALESCE(NEW.full_name, TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')));
  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := 'Prospect';
  END IF;

  -- 2. Construire le lien d'upload
  v_upload_link := 'https://taxiassur.com/espace-prospect/' || NEW.access_token;

  -- 3. Variables pour les templates
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

  -- 4. Insérer dans crm_automation_events (sans bloquer)
  BEGIN
    INSERT INTO crm_automation_events (lead_id, event_type, event_data, new_status)
    VALUES (NEW.id, 'new_lead', jsonb_build_object('source', NEW.source, 'created_at', now()), NEW.status::text);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Silencieux
  END;

  -- 5. Queue les notifications (sans bloquer)
  BEGIN
    PERFORM queue_event_notifications(NEW.id, 'new_lead', jsonb_build_object('source', NEW.source));
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Silencieux
  END;

  -- 6. Insérer une notification admin (sans bloquer)
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Silencieux
  END;

  -- 7. ✅ FIRE AND FORGET : Appel asynchrone sans attendre la réponse
  BEGIN
    v_payload := jsonb_build_object(
      'lead_id', NEW.id::text,
      'name', v_full_name,
      'email', COALESCE(NEW.email, ''),
      'phone', COALESCE(NEW.phone, ''),
      'city', COALESCE(NEW.city, ''),
      'status', COALESCE(NEW.status::text, 'new'),
      'immatriculation', COALESCE(NEW.metadata->>'immatriculation', ''),
      'access_token', NEW.access_token
    );

    -- ✅ PERFORM = Fire and Forget (pas d'attente de réponse)
    PERFORM net.http_post(
      url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-lead-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg'
      ),
      body := v_payload::text
    );

  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ne pas bloquer même si l'appel échoue
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION on_new_lead_post_insert() IS 
'Trigger ASYNCHRONE (fire and forget) qui envoie des notifications email via IONOS SMTP sans bloquer l''insertion du lead.';
