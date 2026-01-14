/*
  # Unification du trigger de notification - Version finale
  
  ## Problème
  - Deux triggers existent : trg_new_lead_created et trg_send_lead_notification
  - Ils entrent en conflit et peuvent causer des doublons ou des échecs
  
  ## Solution
  - Supprimer tous les anciens triggers
  - Créer UN SEUL trigger unifié qui :
    1. Génère l'access_token
    2. Insère dans crm_automation_events
    3. Queue les notifications
    4. Appelle l'edge function send-lead-notification
    5. Insère une notification dans crm_event_notifications pour l'admin
*/

-- ================================================================
-- 1. Supprimer TOUS les anciens triggers
-- ================================================================

DROP TRIGGER IF EXISTS trg_send_lead_notification ON crm_leads;
DROP TRIGGER IF EXISTS trg_new_lead_created ON crm_leads;
DROP TRIGGER IF EXISTS on_new_lead_created ON crm_leads;
DROP TRIGGER IF EXISTS trigger_send_lead_notification ON crm_leads;

-- ================================================================
-- 2. Fonction unifiée pour gérer tout le processus
-- ================================================================

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
    10, -- Haute priorité
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
      'status', COALESCE(NEW.status::text, 'new'),
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

-- ================================================================
-- 3. Créer le trigger unifié (BEFORE INSERT)
-- ================================================================

CREATE TRIGGER trg_on_new_lead_created_unified
  BEFORE INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION on_new_lead_created_unified();

-- ================================================================
-- 4. Commentaires et logs
-- ================================================================

COMMENT ON FUNCTION on_new_lead_created_unified() IS 
  'Fonction unifiée qui gère TOUT le processus de création de lead: access_token, automation_events, notifications queue, edge function email, notification admin';

COMMENT ON TRIGGER trg_on_new_lead_created_unified ON crm_leads IS
  'Trigger principal pour les nouveaux leads - Gère emails, notifications et automation';

-- Log de confirmation
DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '✅ TRIGGER UNIFIÉ ACTIVÉ: trg_on_new_lead_created_unified';
  RAISE NOTICE '📧 Emails automatiques: team@taxiassur.com + prospect';
  RAISE NOTICE '🔔 Notifications admin activées';
  RAISE NOTICE '⚙️  Automation events enregistrés';
  RAISE NOTICE '=================================================================';
END $$;
