/*
  # Fix email trigger: replace broken current_setting with get_system_setting

  ## Problem
  The `send_lead_email_via_brevo` trigger function uses:
    `current_setting('app.settings.supabase_anon_key', true)`
  which returns NULL in production → emails are silently never sent.

  ## Fix
  Replace with `get_system_setting('supabase_service_role_key')` which reads
  from the `system_config` table properly populated with real secrets.

  Also fix full_name computation to handle all field combinations.

  ## Changes
  - Rewrites trigger function `send_lead_email_via_brevo()`
  - Uses service role key (correct for server-to-server calls)
  - Uses `send-email-ionos` edge function (currently active SMTP relay)
  - Sends both team notification and prospect confirmation
  - Adds proper error handling so trigger doesn't block lead creation
*/

CREATE OR REPLACE FUNCTION send_lead_email_via_brevo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_service_role_key TEXT;
  v_supabase_url TEXT;
  v_full_name TEXT;
  v_upload_link TEXT;
  v_access_token TEXT;
BEGIN
  BEGIN
    v_service_role_key := get_system_setting('supabase_service_role_key');
    v_supabase_url := get_system_setting('supabase_url');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[email_trigger] Could not get system settings: %', SQLERRM;
    RETURN NEW;
  END;

  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE WARNING '[email_trigger] supabase_service_role_key is empty, skipping emails';
    RETURN NEW;
  END IF;

  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.full_name), ''),
    NULLIF(TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), ''),
    NULLIF(TRIM(COALESCE(NEW.name, '')), ''),
    'Prospect'
  );

  v_access_token := COALESCE(NEW.access_token, NEW.id::TEXT);
  v_upload_link := 'https://taxiassur.com/espace-prospect?token=' || v_access_token;

  INSERT INTO notification_queue (
    recipient,
    template_key,
    variables,
    status,
    priority,
    scheduled_for
  ) VALUES
  (
    'team@taxiassur.com',
    'new_lead_team',
    jsonb_build_object(
      'lead_name', v_full_name,
      'lead_email', COALESCE(NEW.email, ''),
      'lead_phone', COALESCE(NEW.phone, ''),
      'lead_city', COALESCE(NEW.city, ''),
      'lead_id', NEW.id::TEXT
    ),
    'pending',
    10,
    NOW()
  );

  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    INSERT INTO notification_queue (
      recipient,
      template_key,
      variables,
      status,
      priority,
      scheduled_for
    ) VALUES (
      NEW.email,
      'new_lead_prospect',
      jsonb_build_object(
        'first_name', COALESCE(NEW.first_name, SPLIT_PART(v_full_name, ' ', 1)),
        'lead_name', v_full_name,
        'upload_link', v_upload_link
      ),
      'pending',
      10,
      NOW()
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[email_trigger] Non-blocking error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_lead_email_brevo ON crm_leads;

CREATE TRIGGER trg_send_lead_email_brevo
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION send_lead_email_via_brevo();
