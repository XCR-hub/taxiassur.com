/*
  # ULTRON - Trigger automatique sur tous les nouveaux leads

  ## Ce que ca fait
  Sur chaque nouveau lead insere dans crm_leads :
  1. Enregistre dans ultron_command_log
  2. Lance generate-ai-decisions pour scorer le lead immediatement
  3. Lance pipeline-automation-engine pour demarrer le workflow
  4. Met a jour les KPIs de la Mission 2 (leads quotidiens)
  5. Insere dans la queue de traitement ULTRON pour suivi complet

  ## Tables modifiees
  - ultron_command_log : log de chaque nouveau lead
  - ultron_lead_queue : file d'attente ULTRON pour leads a traiter
  - ultron_missions : KPIs mis a jour en temps reel
*/

-- ============================================================
-- 1. TABLE FILE D'ATTENTE ULTRON LEADS
-- ============================================================

CREATE TABLE IF NOT EXISTS ultron_lead_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  lead_email text,
  lead_name text,
  status text DEFAULT 'pending',
  ai_score integer,
  ai_recommendations jsonb DEFAULT '{}'::jsonb,
  pipeline_started boolean DEFAULT false,
  email_sent boolean DEFAULT false,
  decisions_generated boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT ultron_lead_queue_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE
);

ALTER TABLE ultron_lead_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role ultron queue"
  ON ultron_lead_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated read ultron queue"
  ON ultron_lead_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ultron_queue_lead_id ON ultron_lead_queue(lead_id);
CREATE INDEX IF NOT EXISTS idx_ultron_queue_status ON ultron_lead_queue(status);
CREATE INDEX IF NOT EXISTS idx_ultron_queue_created ON ultron_lead_queue(created_at DESC);

-- ============================================================
-- 2. FONCTION TRIGGER ULTRON NOUVEAU LEAD
-- ============================================================

CREATE OR REPLACE FUNCTION ultron_on_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_lead_name text;
BEGIN
  -- Recuperer config
  SELECT value INTO v_supabase_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO v_service_key FROM system_config WHERE key = 'supabase_service_role_key';

  -- Construire le nom du lead
  v_lead_name := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
  v_lead_name := TRIM(v_lead_name);
  IF v_lead_name = '' THEN
    v_lead_name := COALESCE(NEW.email, 'Lead inconnu');
  END IF;

  -- 1. Log dans ultron_command_log
  INSERT INTO ultron_command_log (action_type, subsystem, status, impact_score, details)
  VALUES (
    'new_lead_captured',
    'ULTRON_LEAD_PIPELINE',
    'success',
    30,
    jsonb_build_object(
      'lead_id', NEW.id,
      'lead_name', v_lead_name,
      'email', NEW.email,
      'source', NEW.source,
      'city', NEW.city,
      'pipeline_stage', NEW.pipeline_stage,
      'captured_at', now()
    )
  );

  -- 2. Inserer dans ultron_lead_queue
  INSERT INTO ultron_lead_queue (lead_id, lead_email, lead_name, status)
  VALUES (NEW.id, NEW.email, v_lead_name, 'pending')
  ON CONFLICT DO NOTHING;

  -- 3. Mise a jour KPIs Mission 2 (async, sans bloquer l'insert)
  BEGIN
    UPDATE ultron_missions
    SET
      kpi_current = jsonb_set(
        COALESCE(kpi_current, '{}'::jsonb),
        '{leads_today}',
        to_jsonb(COALESCE((kpi_current->>'leads_today')::int, 0) + 1)
      ),
      last_action_at = now(),
      updated_at = now()
    WHERE mission_name = 'MISSION_2_DAILY_LEADS';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 4. Lancer generate-ai-decisions pour ce lead (fire and forget)
  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    BEGIN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/generate-ai-decisions',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
          'lead_id', NEW.id,
          'limit', 1,
          'ultron_mode', true
        ),
        timeout_milliseconds := 5000
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. ATTACHER LE TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_ultron_new_lead ON crm_leads;

CREATE TRIGGER trg_ultron_new_lead
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION ultron_on_new_lead();

-- ============================================================
-- 4. FONCTION PROCESSEUR QUEUE ULTRON
-- Traite les leads en attente : decisions IA + pipeline
-- ============================================================

CREATE OR REPLACE FUNCTION ultron_process_lead_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
  v_lead record;
  v_processed integer := 0;
  v_errors integer := 0;
BEGIN
  SELECT value INTO v_supabase_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO v_service_key FROM system_config WHERE key = 'supabase_service_role_key';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN jsonb_build_object('error', 'Config manquante');
  END IF;

  -- Traiter les 10 premiers leads en attente
  FOR v_lead IN
    SELECT q.id, q.lead_id, q.lead_email, q.lead_name
    FROM ultron_lead_queue q
    WHERE q.status = 'pending'
    ORDER BY q.created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Marquer en cours
      UPDATE ultron_lead_queue
      SET status = 'processing'
      WHERE id = v_lead.id;

      -- Lancer pipeline-automation-engine pour ce lead
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/pipeline-automation-engine',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
          'action', 'process_lead',
          'lead_id', v_lead.lead_id
        ),
        timeout_milliseconds := 10000
      );

      -- Marquer comme traite
      UPDATE ultron_lead_queue
      SET
        status = 'processed',
        pipeline_started = true,
        processed_at = now()
      WHERE id = v_lead.id;

      v_processed := v_processed + 1;

      -- Pause entre leads
      PERFORM pg_sleep(0.3);

    EXCEPTION WHEN OTHERS THEN
      UPDATE ultron_lead_queue
      SET status = 'error', error_message = SQLERRM
      WHERE id = v_lead.id;
      v_errors := v_errors + 1;
    END;
  END LOOP;

  -- Log
  IF v_processed > 0 THEN
    INSERT INTO ultron_command_log (action_type, subsystem, status, impact_score, details)
    VALUES (
      'queue_processed',
      'ULTRON_LEAD_QUEUE',
      'success',
      v_processed * 15,
      jsonb_build_object('processed', v_processed, 'errors', v_errors)
    );
  END IF;

  RETURN jsonb_build_object('processed', v_processed, 'errors', v_errors);
END;
$$;

-- ============================================================
-- 5. CRON - Traitement queue ULTRON toutes les 10 minutes
-- ============================================================

SELECT cron.schedule(
  'ultron-process-lead-queue-10min',
  '*/10 * * * *',
  $$SELECT ultron_process_lead_queue();$$
);

-- ============================================================
-- 6. TRAITER LES LEADS EXISTANTS NON ENCORE DANS LA QUEUE
-- (leads des 30 derniers jours pas encore traites par ULTRON)
-- ============================================================

INSERT INTO ultron_lead_queue (lead_id, lead_email, lead_name, status)
SELECT
  l.id,
  l.email,
  TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')),
  'pending'
FROM crm_leads l
WHERE l.created_at >= now() - interval '30 days'
AND NOT EXISTS (
  SELECT 1 FROM ultron_lead_queue q WHERE q.lead_id = l.id
)
ON CONFLICT DO NOTHING;
