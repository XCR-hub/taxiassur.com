/*
  # Stop empty lead notifications

  Prevents "undefined" hourly lead emails/SMS from being queued or sent when a
  lead has no usable contact information. This is intentionally defensive because
  the project has several historical lead notification paths.
*/

CREATE OR REPLACE FUNCTION public.is_real_contact_text(input_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT input_value IS NOT NULL
    AND btrim(input_value) <> ''
    AND lower(btrim(input_value)) NOT IN ('undefined', 'null', 'nan', 'none', 'n/a', 'na');
$$;

CREATE OR REPLACE FUNCTION public.is_real_email_text(input_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.is_real_contact_text(input_value)
    AND btrim(input_value) ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$';
$$;

CREATE OR REPLACE FUNCTION public.send_lead_email_via_brevo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_service_role_key text;
  v_supabase_url text;
  v_full_name text;
  v_first_name text;
  v_email text;
  v_phone text;
  v_city text;
  v_upload_link text;
  v_access_token text;
BEGIN
  v_email := btrim(COALESCE(NEW.email, ''));
  IF NOT public.is_real_contact_text(v_email) THEN
    v_email := NULL;
  END IF;

  v_phone := btrim(COALESCE(NEW.phone, ''));
  IF NOT public.is_real_contact_text(v_phone) THEN
    v_phone := NULL;
  END IF;

  IF v_email IS NULL AND v_phone IS NULL THEN
    RAISE WARNING '[email_trigger] Empty lead % skipped: no usable email or phone', NEW.id;
    RETURN NEW;
  END IF;

  BEGIN
    v_service_role_key := get_system_setting('supabase_service_role_key');
    v_supabase_url := get_system_setting('supabase_url');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[email_trigger] Could not get system settings: %', SQLERRM;
    RETURN NEW;
  END;

  IF NOT public.is_real_contact_text(v_service_role_key) THEN
    RAISE WARNING '[email_trigger] supabase_service_role_key is empty, skipping emails';
    RETURN NEW;
  END IF;

  v_full_name := COALESCE(
    NULLIF(btrim(COALESCE(NEW.full_name, '')), ''),
    NULLIF(btrim(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), ''),
    'Prospect'
  );

  IF NOT public.is_real_contact_text(v_full_name) THEN
    v_full_name := 'Prospect';
  END IF;

  v_first_name := COALESCE(
    NULLIF(btrim(COALESCE(NEW.first_name, '')), ''),
    split_part(v_full_name, ' ', 1),
    'Prospect'
  );

  IF NOT public.is_real_contact_text(v_first_name) THEN
    v_first_name := 'Prospect';
  END IF;

  v_city := btrim(COALESCE(NEW.city, ''));
  IF NOT public.is_real_contact_text(v_city) THEN
    v_city := 'Non renseigne';
  END IF;

  v_access_token := COALESCE(NULLIF(btrim(COALESCE(NEW.access_token, '')), ''), NEW.id::text);
  v_upload_link := 'https://taxiassur.com/espace-prospect?token=' || v_access_token;

  INSERT INTO notification_queue (
    recipient,
    template_key,
    variables,
    status,
    priority,
    scheduled_for
  ) VALUES (
    'team@taxiassur.com',
    'new_lead_team',
    jsonb_build_object(
      'lead_name', v_full_name,
      'lead_email', COALESCE(v_email, ''),
      'lead_phone', COALESCE(v_phone, ''),
      'lead_city', v_city,
      'lead_id', NEW.id::text
    ),
    'pending',
    10,
    now()
  );

  IF public.is_real_email_text(v_email) THEN
    INSERT INTO notification_queue (
      recipient,
      template_key,
      variables,
      status,
      priority,
      scheduled_for
    ) VALUES (
      v_email,
      'new_lead_prospect',
      jsonb_build_object(
        'first_name', v_first_name,
        'lead_name', v_full_name,
        'upload_link', v_upload_link
      ),
      'pending',
      10,
      now()
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[email_trigger] Non-blocking error: %', SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_queue_new_lead_emails ON public.crm_leads;
CREATE TRIGGER trg_queue_new_lead_emails
  AFTER INSERT ON public.crm_leads
  FOR EACH ROW
  WHEN (
    public.is_real_contact_text(NEW.email)
    OR public.is_real_contact_text(NEW.phone)
  )
  EXECUTE FUNCTION public.send_lead_email_via_brevo();

DROP TRIGGER IF EXISTS trg_send_lead_email_brevo ON public.crm_leads;
DROP TRIGGER IF EXISTS trg_notify_new_lead_ionos ON public.crm_leads;

CREATE OR REPLACE FUNCTION public.enqueue_sms_for_lead_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_lead_id uuid;
  v_vars jsonb;
  v_template text;
  v_team_phone text := '0180855786';
BEGIN
  v_template := NEW.template_key;
  v_vars := COALESCE(NEW.variables, '{}'::jsonb);
  v_lead_id := NEW.lead_id;

  IF v_lead_id IS NOT NULL THEN
    SELECT phone INTO v_phone
    FROM public.crm_leads
    WHERE id = v_lead_id;
  END IF;

  IF NOT public.is_real_contact_text(v_phone) THEN
    v_phone := v_vars->>'lead_phone';
  END IF;

  IF NOT public.is_real_contact_text(v_phone) THEN
    RETURN NEW;
  END IF;

  IF v_template IN (
    'new_lead_prospect',
    'new_lead_confirmation',
    'relance_documents',
    'document_reminder',
    'quote_ready',
    'devis_envoye',
    'relance_devis',
    'quote_reminder',
    'relance_paiement',
    'payment_reminder',
    'relance_signature',
    'signature_reminder',
    'welcome_client',
    'client_actif'
  ) THEN
    INSERT INTO sms_queue (
      lead_id,
      recipient,
      template_key,
      variables,
      status,
      priority,
      scheduled_for
    ) VALUES (
      v_lead_id,
      v_phone,
      v_template,
      v_vars,
      'pending',
      NEW.priority,
      now()
    );
  END IF;

  IF v_template IN ('new_lead_team', 'new_lead_commercial') THEN
    INSERT INTO sms_queue (
      lead_id,
      recipient,
      template_key,
      variables,
      status,
      priority,
      scheduled_for
    ) VALUES (
      v_lead_id,
      v_team_phone,
      v_template,
      v_vars,
      'pending',
      1,
      now()
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enqueue_sms_on_email ON public.notification_queue;
CREATE TRIGGER trg_enqueue_sms_on_email
  AFTER INSERT ON public.notification_queue
  FOR EACH ROW
  WHEN (
    (NEW.template_key NOT IN ('new_lead_team', 'new_lead_commercial'))
    OR public.is_real_contact_text(NEW.variables->>'lead_phone')
    OR public.is_real_contact_text(NEW.variables->>'lead_email')
  )
  EXECUTE FUNCTION public.enqueue_sms_for_lead_notification();

CREATE OR REPLACE FUNCTION public.enqueue_sms_new_lead_direct()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_access_token text;
  v_upload_link text;
  v_first_name text;
  v_full_name text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_real_contact_text(NEW.phone) THEN
    RETURN NEW;
  END IF;

  v_access_token := NEW.access_token;
  IF NOT public.is_real_contact_text(v_access_token) THEN
    v_access_token := encode(gen_random_bytes(32), 'hex');
    UPDATE public.crm_leads SET access_token = v_access_token WHERE id = NEW.id;
  END IF;

  v_upload_link := 'https://taxiassur.com/espace-prospect?token=' || v_access_token;
  v_full_name := COALESCE(
    NULLIF(btrim(COALESCE(NEW.full_name, '')), ''),
    NULLIF(btrim(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), ''),
    'Prospect'
  );
  v_first_name := COALESCE(NULLIF(btrim(COALESCE(NEW.first_name, '')), ''), split_part(v_full_name, ' ', 1), 'Prospect');

  IF NOT EXISTS (
    SELECT 1 FROM public.sms_queue
    WHERE lead_id = NEW.id
      AND template_key = 'new_lead_prospect'
      AND created_at > now() - interval '2 minutes'
  ) THEN
    INSERT INTO public.sms_queue (lead_id, recipient, template_key, variables, priority, scheduled_for)
    VALUES (
      NEW.id,
      btrim(NEW.phone),
      'new_lead_prospect',
      jsonb_build_object(
        'first_name', v_first_name,
        'lead_name', v_full_name,
        'lead_phone', btrim(NEW.phone),
        'lead_email', CASE WHEN public.is_real_contact_text(NEW.email) THEN btrim(NEW.email) ELSE '' END,
        'lead_city', CASE WHEN public.is_real_contact_text(NEW.city) THEN btrim(NEW.city) ELSE '' END,
        'upload_link', v_upload_link,
        'prospect_link', v_upload_link
      ),
      1,
      now()
    );

    INSERT INTO public.sms_queue (lead_id, recipient, template_key, variables, priority, scheduled_for)
    VALUES (
      NEW.id,
      '0180855786',
      'new_lead_team',
      jsonb_build_object(
        'lead_name', v_full_name,
        'lead_phone', btrim(NEW.phone),
        'lead_email', CASE WHEN public.is_real_contact_text(NEW.email) THEN btrim(NEW.email) ELSE '' END,
        'lead_city', CASE WHEN public.is_real_contact_text(NEW.city) THEN btrim(NEW.city) ELSE '' END
      ),
      1,
      now()
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sms_new_lead_direct ON public.crm_leads;
CREATE TRIGGER trg_sms_new_lead_direct
  AFTER INSERT ON public.crm_leads
  FOR EACH ROW
  WHEN (public.is_real_contact_text(NEW.phone))
  EXECUTE FUNCTION public.enqueue_sms_new_lead_direct();

DO $$
BEGIN
  IF to_regclass('public.notification_queue') IS NOT NULL THEN
    BEGIN
      UPDATE public.notification_queue
      SET
        status = 'failed',
        error_message = COALESCE(NULLIF(error_message, ''), 'Skipped invalid empty lead notification'),
        attempts = COALESCE(attempts, 0) + 1
      WHERE status = 'pending'
        AND template_key IN ('new_lead_team', 'new_lead_commercial')
        AND NOT public.is_real_contact_text(COALESCE(variables->>'lead_phone', variables->>'phone', variables->>'telephone'))
        AND NOT public.is_real_contact_text(COALESCE(variables->>'lead_email', variables->>'email', variables->>'mail'));
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
  END IF;

  IF to_regclass('public.email_queue') IS NOT NULL THEN
    BEGIN
      UPDATE public.email_queue
      SET
        status = 'failed',
        error_message = COALESCE(NULLIF(error_message, ''), 'Skipped invalid empty lead email'),
        retry_count = COALESCE(retry_count, 0) + 1
      WHERE status IN ('pending', 'sending')
        AND email_type IN ('new_lead_team', 'new_lead_client')
        AND NOT public.is_real_contact_text(to_email)
        AND (
          body IS NULL
          OR (
            body ILIKE '%undefined%'
            AND body NOT ILIKE '%@%'
            AND body !~ '[0-9]{6,}'
          )
        );
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
  END IF;

  IF to_regclass('public.sms_queue') IS NOT NULL THEN
    BEGIN
      UPDATE public.sms_queue
      SET
        status = 'failed',
        error_message = COALESCE(NULLIF(error_message, ''), 'Skipped invalid empty lead SMS'),
        attempts = COALESCE(attempts, 0) + 1
      WHERE status = 'pending'
        AND template_key IN ('new_lead_team', 'new_lead_commercial', 'new_lead_prospect', 'new_lead_confirmation')
        AND NOT public.is_real_contact_text(recipient);
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
  END IF;
END $$;

COMMENT ON FUNCTION public.is_real_contact_text(text) IS
'Returns false for blank placeholder text such as undefined/null/nan. Used to stop empty lead notifications.';

COMMENT ON FUNCTION public.send_lead_email_via_brevo() IS
'Queues lead email notifications only when the lead has a usable email or phone.';

