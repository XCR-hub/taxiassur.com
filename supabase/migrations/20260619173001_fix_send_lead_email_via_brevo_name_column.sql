-- Fix: send_lead_email_via_brevo references NEW.name which doesn't exist
-- The column is called full_name in crm_leads
CREATE OR REPLACE FUNCTION public.send_lead_email_via_brevo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

-- Re-enable the backup queue trigger that was disabled
ALTER TABLE crm_leads ENABLE TRIGGER trg_queue_new_lead_emails;
