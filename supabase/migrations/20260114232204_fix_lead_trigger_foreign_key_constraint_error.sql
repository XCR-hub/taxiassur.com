/*
  # Fix lead trigger foreign key constraint error
  
  ## Problème
  Le trigger trg_on_new_lead_created_unified s'exécute BEFORE INSERT et essaie d'insérer dans crm_automation_events
  avant que le lead soit réellement créé, causant l'erreur:
  "insert or update on table "crm_automation_events" violates foreign key constraint "crm_automation_events_lead_id_fkey"
  
  ## Solution
  Séparer la logique en 2 triggers:
  1. BEFORE INSERT: Génération de l'access_token uniquement
  2. AFTER INSERT: Automation events, notifications et emails
*/

-- ================================================================
-- 1. Supprimer l'ancien trigger unifié
-- ================================================================

DROP TRIGGER IF EXISTS trg_on_new_lead_created_unified ON crm_leads;
DROP FUNCTION IF EXISTS on_new_lead_created_unified();

-- ================================================================
-- 2. Créer la fonction BEFORE INSERT (access_token uniquement)
-- ================================================================

CREATE OR REPLACE FUNCTION generate_crm_lead_access_token_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Générer access_token si pas défini
  IF NEW.access_token IS NULL OR NEW.access_token = '' THEN
    NEW.access_token := encode(sha256((NEW.id::text || COALESCE(NEW.email, '') || extract(epoch from now())::text)::bytea), 'hex');
  END IF;
  
  RETURN NEW;
END;
$$;

-- ================================================================
-- 3. Créer la fonction AFTER INSERT (automation, notifications, emails)
-- ================================================================

CREATE OR REPLACE FUNCTION on_new_lead_post_insert()
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

  -- 4. Insérer dans crm_automation_events (maintenant le lead existe déjà)
  BEGIN
    INSERT INTO crm_automation_events (lead_id, event_type, event_data, new_status)
    VALUES (NEW.id, 'new_lead', jsonb_build_object('source', NEW.source, 'created_at', now()), NEW.status::text);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to insert automation event: %', SQLERRM;
  END;

  -- 5. Queue les notifications via la fonction queue_event_notifications
  BEGIN
    PERFORM queue_event_notifications(NEW.id, 'new_lead', jsonb_build_object('source', NEW.source));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'queue_event_notifications failed: %', SQLERRM;
  END;

  -- 6. Insérer une notification pour l'admin dans crm_event_notifications
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
    RAISE WARNING 'Failed to insert admin notification: %', SQLERRM;
  END;

  -- 7. Appeler l'edge function send-lead-notification pour envoi immédiat des emails
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
-- 4. Créer les triggers
-- ================================================================

-- Trigger BEFORE INSERT: génération de l'access_token
DROP TRIGGER IF EXISTS trg_crm_leads_before_insert ON crm_leads;
CREATE TRIGGER trg_crm_leads_before_insert
  BEFORE INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION generate_crm_lead_access_token_v2();

-- Trigger AFTER INSERT: automation, notifications, emails
DROP TRIGGER IF EXISTS trg_crm_leads_after_insert ON crm_leads;
CREATE TRIGGER trg_crm_leads_after_insert
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION on_new_lead_post_insert();

-- ================================================================
-- 5. Commentaires et logs
-- ================================================================

COMMENT ON FUNCTION generate_crm_lead_access_token_v2() IS 
  'Génère un access_token unique pour chaque nouveau lead (BEFORE INSERT)';

COMMENT ON FUNCTION on_new_lead_post_insert() IS 
  'Gère automation events, notifications et emails après insertion du lead (AFTER INSERT)';

COMMENT ON TRIGGER trg_crm_leads_before_insert ON crm_leads IS
  'Génère access_token avant insertion';

COMMENT ON TRIGGER trg_crm_leads_after_insert ON crm_leads IS
  'Gère automation events, notifications et emails après insertion';

-- Log de confirmation
DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '✅ TRIGGERS SÉPARÉS CRÉÉS:';
  RAISE NOTICE '   - trg_crm_leads_before_insert (access_token)';
  RAISE NOTICE '   - trg_crm_leads_after_insert (automation, notifications, emails)';
  RAISE NOTICE '📧 Emails automatiques: team@taxiassur.com + prospect';
  RAISE NOTICE '🔔 Notifications admin activées';
  RAISE NOTICE '⚙️  Automation events enregistrés';
  RAISE NOTICE '🔒 Foreign key constraint error corrigé!';
  RAISE NOTICE '=================================================================';
END $$;
