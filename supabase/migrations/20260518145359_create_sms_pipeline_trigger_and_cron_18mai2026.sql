/*
  # SMS Pipeline Stage Trigger and Cron Job

  1. Changes
    - Trigger function that queues SMS when pipeline_stage changes
    - Cron job to process SMS queue every 2 minutes
    - Helper function to increment unread count

  2. Notes
    - Only sends during business hours (8h-20h)
    - Respects max 3 SMS per lead per day
    - Matches workflow rules by stage transitions
*/

-- Helper: increment unread count
CREATE OR REPLACE FUNCTION increment_sms_unread(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sms_conversations
  SET unread_count = unread_count + 1
  WHERE id = p_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_sms_unread(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION increment_sms_unread(uuid) TO authenticated;

-- Trigger function: queue SMS on pipeline stage change
CREATE OR REPLACE FUNCTION trigger_sms_on_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule RECORD;
  v_message text;
  v_prospect_url text;
  v_conv_id uuid;
  v_current_hour integer;
BEGIN
  -- Only fire if pipeline_stage actually changed
  IF OLD.pipeline_stage IS NOT DISTINCT FROM NEW.pipeline_stage THEN
    RETURN NEW;
  END IF;

  -- Only during business hours
  v_current_hour := EXTRACT(HOUR FROM now() AT TIME ZONE 'Europe/Paris');
  IF v_current_hour < 8 OR v_current_hour >= 20 THEN
    RETURN NEW;
  END IF;

  -- Need a phone number
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  -- Check daily limit
  IF (SELECT count(*) FROM sms_messages WHERE lead_id = NEW.id AND direction = 'outbound' AND created_at >= CURRENT_DATE) >= 3 THEN
    RETURN NEW;
  END IF;

  -- Find matching workflow rules
  FOR v_rule IN
    SELECT * FROM sms_workflow_rules
    WHERE is_active = true
      AND trigger_type = 'stage_change'
      AND (trigger_config->>'to_stage' = NEW.pipeline_stage OR trigger_config->>'to_stage' IS NULL)
      AND (trigger_config->>'from_stage' = OLD.pipeline_stage OR trigger_config->>'from_stage' IS NULL)
    ORDER BY priority DESC
    LIMIT 1
  LOOP
    -- Build prospect URL
    v_prospect_url := CASE
      WHEN NEW.access_token IS NOT NULL THEN 'https://taxiassur.com/espace-prospect?token=' || NEW.access_token
      ELSE 'https://taxiassur.com'
    END;

    -- Replace template variables
    v_message := v_rule.message_template;
    v_message := replace(v_message, '{{first_name}}', COALESCE(NEW.first_name, ''));
    v_message := replace(v_message, '{{last_name}}', COALESCE(NEW.last_name, ''));
    v_message := replace(v_message, '{{prospect_url}}', v_prospect_url);
    v_message := replace(v_message, '{{email}}', COALESCE(NEW.email, ''));

    -- Get or create conversation
    SELECT get_or_create_sms_conversation(NEW.phone, NEW.id) INTO v_conv_id;

    -- Queue the SMS (will be sent by cron)
    INSERT INTO sms_messages (
      conversation_id, lead_id, direction, from_number, to_number,
      content, status, is_automated, workflow_trigger
    ) VALUES (
      v_conv_id, NEW.id, 'outbound', '+33744410598', NEW.phone,
      v_message, 'pending', true, v_rule.name
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS trg_sms_on_stage_change ON crm_leads;
CREATE TRIGGER trg_sms_on_stage_change
  AFTER UPDATE OF pipeline_stage ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sms_on_stage_change();

-- Cron: process SMS queue every 2 minutes
SELECT cron.unschedule('process-sms-queue-v2') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-sms-queue-v2'
);

SELECT cron.schedule(
  'process-sms-queue-v2',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-sms-queue',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
