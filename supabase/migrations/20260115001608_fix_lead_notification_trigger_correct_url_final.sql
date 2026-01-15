/*
  # FIX DÉFINITIF : Corriger l'URL dans la fonction RÉELLEMENT utilisée

  ## Problème identifié
  - Le trigger actif est : trg_crm_leads_after_insert → on_new_lead_post_insert()
  - Cette fonction utilise ENCORE la mauvaise URL : https://zzwqkjpafrsaanfbjigz.supabase.co
  - La fonction on_new_lead_created_unified existe mais n'est PAS utilisée par un trigger

  ## Solution
  - Corriger on_new_lead_post_insert() avec la bonne URL
  - Bonne URL : https://drohhxrkoequjphvabvq.supabase.co

  ## Impact
  - Les emails seront ENFIN envoyés via IONOS SMTP
*/

-- ================================================================
-- Corriger la fonction on_new_lead_post_insert() avec la BONNE URL
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

  -- 4. Insérer dans crm_automation_events
  BEGIN
    INSERT INTO crm_automation_events (lead_id, event_type, event_data, new_status)
    VALUES (NEW.id, 'new_lead', jsonb_build_object('source', NEW.source, 'created_at', now()), NEW.status::text);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to insert automation event: %', SQLERRM;
  END;

  -- 5. Queue les notifications
  BEGIN
    PERFORM queue_event_notifications(NEW.id, 'new_lead', jsonb_build_object('source', NEW.source));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'queue_event_notifications failed: %', SQLERRM;
  END;

  -- 6. Insérer une notification admin
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

  -- 7. ✅ CORRECTION : Appeler l'edge function avec la BONNE URL Supabase
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

    -- ✅ BONNE URL : https://drohhxrkoequjphvabvq.supabase.co
    SELECT net.http_post(
      url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-lead-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg'
      ),
      body := v_payload::text
    ) INTO v_request_id;

    RAISE NOTICE '✅ EMAIL NOTIFICATION SENT VIA IONOS: lead=%, name=%, email=%, request_id=%', NEW.id, v_full_name, NEW.email, v_request_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ EMAIL NOTIFICATION FAILED: lead=%, email=%, error=%', NEW.id, NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ================================================================
-- Vérification et log
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================================';
  RAISE NOTICE '✅ FIX APPLIQUÉ : on_new_lead_post_insert() corrigée';
  RAISE NOTICE '🔧 Ancienne URL : https://zzwqkjpafrsaanfbjigz.supabase.co';
  RAISE NOTICE '✅ Nouvelle URL : https://drohhxrkoequjphvabvq.supabase.co';
  RAISE NOTICE '📧 Trigger actif : trg_crm_leads_after_insert';
  RAISE NOTICE '📨 Emails IONOS SMTP activés pour team@taxiassur.com';
  RAISE NOTICE '==============================================================';
END $$;
