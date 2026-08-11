-- Secure, payload-minimal claim notification trigger.
-- The Edge Function reloads the claim and recipient from storage; no PII is sent here.
CREATE OR REPLACE FUNCTION public.enqueue_secure_claim_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_supabase_url text := current_setting('app.supabase_url', true);
  v_anon_key text := current_setting('app.anon_key', true);
  v_kind text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_kind := 'new_claim';
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    IF (v_old -> 'claim_status') IS NOT DISTINCT FROM (v_new -> 'claim_status')
       AND (v_old -> 'status') IS NOT DISTINCT FROM (v_new -> 'status')
       AND (v_old -> 'client_visible_status') IS NOT DISTINCT FROM (v_new -> 'client_visible_status')
       AND (v_old -> 'client_visible_notes') IS NOT DISTINCT FROM (v_new -> 'client_visible_notes') THEN
      RETURN NEW;
    END IF;
    v_kind := 'status_update';
  END IF;

  IF nullif(v_supabase_url, '') IS NULL OR nullif(v_anon_key, '') IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := rtrim(v_supabase_url, '/') || '/functions/v1/notify-claim',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := jsonb_build_object('type', v_kind, 'claim_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_secure_claim_notification() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_secure_claim_notification() TO service_role;

DROP TRIGGER IF EXISTS trg_enqueue_secure_claim_notification ON public.crm_claims;
CREATE TRIGGER trg_enqueue_secure_claim_notification
AFTER INSERT OR UPDATE ON public.crm_claims
FOR EACH ROW EXECUTE FUNCTION public.enqueue_secure_claim_notification();