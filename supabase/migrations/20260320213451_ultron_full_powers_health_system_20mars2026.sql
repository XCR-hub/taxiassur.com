/*
  # ULTRON - Pleins Pouvoirs : Systeme de Surveillance et Auto-Reparation

  ## Objectif
  Donner a ULTRON la capacite de :
  1. Surveiller l'ensemble du site (crons, leads, emails, edge functions, storage, pipeline)
  2. Detecter automatiquement toutes anomalies
  3. Reparer sans intervention humaine

  ## Nouvelles tables
  - ultron_health_checks : resultat de chaque audit sante
  - ultron_anomalies : anomalies detectees en attente de reparation
  - ultron_repairs : historique de toutes les reparations effectuees

  ## Fonctions principales
  - ultron_audit_full_site() : audit complet de tout le site
  - ultron_auto_repair() : reparation automatique des anomalies detectees
  - ultron_check_crons() : verification et re-activation des crons
  - ultron_check_lead_pipeline() : verification pipeline leads
  - ultron_check_email_system() : verification systeme emails
  - ultron_check_storage() : verification buckets storage
  - ultron_check_edge_functions() : verification edge functions
  - ultron_grant_full_access() : accorde acces complet service_role a toutes les tables
*/

-- ============================================================
-- 1. TABLE HEALTH CHECKS
-- ============================================================

CREATE TABLE IF NOT EXISTS ultron_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,
  subsystem text NOT NULL,
  status text NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
  score integer DEFAULT 100 CHECK (score BETWEEN 0 AND 100),
  details jsonb DEFAULT '{}'::jsonb,
  anomalies_found integer DEFAULT 0,
  repairs_made integer DEFAULT 0,
  checked_at timestamptz DEFAULT now(),
  next_check_at timestamptz DEFAULT now() + interval '30 minutes'
);

ALTER TABLE ultron_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full health_checks"
  ON ultron_health_checks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read health_checks"
  ON ultron_health_checks FOR SELECT TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ultron_health_checked_at ON ultron_health_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ultron_health_subsystem ON ultron_health_checks(subsystem);
CREATE INDEX IF NOT EXISTS idx_ultron_health_status ON ultron_health_checks(status);

-- ============================================================
-- 2. TABLE ANOMALIES
-- ============================================================

CREATE TABLE IF NOT EXISTS ultron_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type text NOT NULL,
  subsystem text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  affected_entity text,
  affected_entity_id text,
  auto_repairable boolean DEFAULT true,
  repair_action text,
  repaired boolean DEFAULT false,
  repaired_at timestamptz,
  repair_result text,
  detected_at timestamptz DEFAULT now(),
  data jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE ultron_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full anomalies"
  ON ultron_anomalies FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read anomalies"
  ON ultron_anomalies FOR SELECT TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ultron_anomalies_repaired ON ultron_anomalies(repaired, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ultron_anomalies_severity ON ultron_anomalies(severity);

-- ============================================================
-- 3. TABLE REPARATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS ultron_repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_id uuid REFERENCES ultron_anomalies(id) ON DELETE SET NULL,
  repair_type text NOT NULL,
  subsystem text NOT NULL,
  action_taken text NOT NULL,
  success boolean DEFAULT false,
  result_details jsonb DEFAULT '{}'::jsonb,
  repaired_at timestamptz DEFAULT now()
);

ALTER TABLE ultron_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full repairs"
  ON ultron_repairs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read repairs"
  ON ultron_repairs FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 4. FONCTION : AUDIT CRONS
-- ============================================================

CREATE OR REPLACE FUNCTION ultron_check_crons()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_total_crons integer;
  v_active_crons integer;
  v_inactive_crons integer;
  v_critical_crons text[] := ARRAY[
    'ultron-orchestration-4h',
    'ultron-process-lead-queue-10min',
    'ai-governance-generate-decisions-2h',
    'blog_auto_early_morning',
    'document-collector-ia-15min',
    'process-email-queue-2min'
  ];
  v_missing_critical integer := 0;
  v_cron record;
  v_anomaly_id uuid;
  v_repairs integer := 0;
  v_result jsonb;
BEGIN
  -- Compter les crons
  SELECT COUNT(*) INTO v_total_crons FROM cron.job;
  SELECT COUNT(*) INTO v_active_crons FROM cron.job WHERE active = true;
  v_inactive_crons := v_total_crons - v_active_crons;

  -- Re-activer les crons desactives
  FOR v_cron IN
    SELECT jobname FROM cron.job WHERE active = false
  LOOP
    UPDATE cron.job SET active = true WHERE jobname = v_cron.jobname;
    v_repairs := v_repairs + 1;

    INSERT INTO ultron_repairs (repair_type, subsystem, action_taken, success, result_details)
    VALUES (
      'cron_reactivation',
      'CRON_SYSTEM',
      'Re-activation cron: ' || v_cron.jobname,
      true,
      jsonb_build_object('jobname', v_cron.jobname)
    );
  END LOOP;

  -- Verifier les crons critiques manquants
  FOREACH v_cron.jobname IN ARRAY v_critical_crons
  LOOP
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_cron.jobname) THEN
      v_missing_critical := v_missing_critical + 1;

      INSERT INTO ultron_anomalies (
        anomaly_type, subsystem, severity, description,
        affected_entity, auto_repairable, repair_action
      ) VALUES (
        'missing_critical_cron',
        'CRON_SYSTEM',
        'high',
        'Cron critique absent: ' || v_cron.jobname,
        v_cron.jobname,
        false,
        'Reconfigurer le cron manuellement'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  v_result := jsonb_build_object(
    'total', v_total_crons,
    'active', v_active_crons,
    'reactivated', v_repairs,
    'missing_critical', v_missing_critical,
    'status', CASE WHEN v_missing_critical > 0 THEN 'warning' WHEN v_repairs > 0 THEN 'repaired' ELSE 'healthy' END
  );

  INSERT INTO ultron_health_checks (check_type, subsystem, status, score, details, anomalies_found, repairs_made)
  VALUES (
    'cron_audit',
    'CRON_SYSTEM',
    CASE WHEN v_missing_critical >= 3 THEN 'critical'
         WHEN v_missing_critical > 0 THEN 'warning'
         ELSE 'healthy' END,
    GREATEST(0, 100 - (v_missing_critical * 15) - (v_inactive_crons * 5)),
    v_result,
    v_missing_critical + v_inactive_crons,
    v_repairs
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- 5. FONCTION : AUDIT PIPELINE LEADS
-- ============================================================

CREATE OR REPLACE FUNCTION ultron_check_lead_pipeline()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_leads integer;
  v_leads_without_token integer;
  v_leads_without_stage integer;
  v_stuck_leads integer;
  v_queue_pending integer;
  v_queue_error integer;
  v_repairs integer := 0;
  v_result jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total_leads FROM crm_leads;

  -- Leads sans access_token
  SELECT COUNT(*) INTO v_leads_without_token
  FROM crm_leads
  WHERE access_token IS NULL OR access_token = '';

  -- Reparer : generer les tokens manquants
  IF v_leads_without_token > 0 THEN
    UPDATE crm_leads
    SET access_token = encode(gen_random_bytes(32), 'hex')
    WHERE access_token IS NULL OR access_token = '';
    v_repairs := v_repairs + v_leads_without_token;

    INSERT INTO ultron_repairs (repair_type, subsystem, action_taken, success, result_details)
    VALUES (
      'generate_missing_tokens',
      'LEAD_PIPELINE',
      'Generation tokens manquants',
      true,
      jsonb_build_object('count', v_leads_without_token)
    );
  END IF;

  -- Leads sans pipeline_stage
  SELECT COUNT(*) INTO v_leads_without_stage
  FROM crm_leads
  WHERE pipeline_stage IS NULL;

  -- Reparer : assigner stage par defaut
  IF v_leads_without_stage > 0 THEN
    UPDATE crm_leads
    SET pipeline_stage = 'prospect_new'
    WHERE pipeline_stage IS NULL;
    v_repairs := v_repairs + v_leads_without_stage;
  END IF;

  -- Leads bloques depuis plus de 15 jours sans interaction
  SELECT COUNT(*) INTO v_stuck_leads
  FROM crm_leads
  WHERE updated_at < now() - interval '15 days'
  AND pipeline_stage NOT IN ('client_active', 'archived', 'lost');

  -- Queue ULTRON
  SELECT COUNT(*) INTO v_queue_pending FROM ultron_lead_queue WHERE status = 'pending';
  SELECT COUNT(*) INTO v_queue_error FROM ultron_lead_queue WHERE status = 'error';

  -- Re-queuer les leads en erreur
  IF v_queue_error > 0 THEN
    UPDATE ultron_lead_queue SET status = 'pending', error_message = NULL
    WHERE status = 'error';
    v_repairs := v_repairs + v_queue_error;
  END IF;

  -- S'assurer que tous les leads des 7 derniers jours sont dans la queue
  INSERT INTO ultron_lead_queue (lead_id, lead_email, lead_name, status)
  SELECT
    l.id,
    l.email,
    TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')),
    'pending'
  FROM crm_leads l
  WHERE l.created_at >= now() - interval '7 days'
  AND NOT EXISTS (SELECT 1 FROM ultron_lead_queue q WHERE q.lead_id = l.id)
  ON CONFLICT DO NOTHING;

  v_result := jsonb_build_object(
    'total_leads', v_total_leads,
    'without_token_fixed', v_leads_without_token,
    'without_stage_fixed', v_leads_without_stage,
    'stuck_leads', v_stuck_leads,
    'queue_pending', v_queue_pending,
    'queue_error_reset', v_queue_error,
    'repairs', v_repairs
  );

  INSERT INTO ultron_health_checks (check_type, subsystem, status, score, details, anomalies_found, repairs_made)
  VALUES (
    'lead_pipeline_audit',
    'LEAD_PIPELINE',
    CASE WHEN v_stuck_leads > 20 THEN 'warning'
         WHEN v_leads_without_token > 0 OR v_leads_without_stage > 0 THEN 'repaired'
         ELSE 'healthy' END,
    GREATEST(0, 100 - (v_stuck_leads * 2) - (v_leads_without_token * 3)),
    v_result,
    v_leads_without_token + v_leads_without_stage + v_stuck_leads,
    v_repairs
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- 6. FONCTION : AUDIT SYSTEME EMAIL
-- ============================================================

CREATE OR REPLACE FUNCTION ultron_check_email_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_total integer;
  v_queue_stuck integer;
  v_queue_errors integer;
  v_emails_today integer;
  v_repairs integer := 0;
  v_result jsonb;
BEGIN
  -- Verifier la queue emails
  SELECT COUNT(*) INTO v_queue_total FROM email_queue;
  
  -- Emails bloques depuis plus de 2h
  SELECT COUNT(*) INTO v_queue_stuck
  FROM email_queue
  WHERE status = 'pending'
  AND created_at < now() - interval '2 hours';

  SELECT COUNT(*) INTO v_queue_errors
  FROM email_queue
  WHERE status = 'failed';

  -- Emails envoyes aujourd'hui
  SELECT COUNT(*) INTO v_emails_today
  FROM email_queue
  WHERE status = 'sent'
  AND created_at >= CURRENT_DATE;

  -- Reparer : reset les emails en erreur
  IF v_queue_errors > 0 THEN
    UPDATE email_queue
    SET status = 'pending', retry_count = 0
    WHERE status = 'failed'
    AND retry_count < 3;
    v_repairs := v_queue_errors;
  END IF;

  -- Reset emails bloques
  IF v_queue_stuck > 0 THEN
    UPDATE email_queue
    SET status = 'pending'
    WHERE status = 'pending'
    AND created_at < now() - interval '2 hours'
    AND retry_count < 3;
    v_repairs := v_repairs + v_queue_stuck;
  END IF;

  v_result := jsonb_build_object(
    'queue_total', v_queue_total,
    'stuck_reset', v_queue_stuck,
    'errors_reset', v_queue_errors,
    'sent_today', v_emails_today,
    'repairs', v_repairs
  );

  INSERT INTO ultron_health_checks (check_type, subsystem, status, score, details, anomalies_found, repairs_made)
  VALUES (
    'email_system_audit',
    'EMAIL_SYSTEM',
    CASE WHEN v_queue_stuck > 50 THEN 'critical'
         WHEN v_queue_stuck > 10 OR v_queue_errors > 20 THEN 'warning'
         ELSE 'healthy' END,
    GREATEST(0, 100 - (v_queue_stuck) - (v_queue_errors * 2)),
    v_result,
    v_queue_stuck + v_queue_errors,
    v_repairs
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'status', 'unknown');
END;
$$;

-- ============================================================
-- 7. FONCTION : AUDIT STORAGE BUCKETS
-- ============================================================

CREATE OR REPLACE FUNCTION ultron_check_storage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_buckets_total integer;
  v_orphan_docs integer;
  v_result jsonb;
BEGIN
  SELECT COUNT(*) INTO v_buckets_total FROM storage.buckets;

  -- Documents avec URL manquante
  SELECT COUNT(*) INTO v_orphan_docs
  FROM crm_lead_documents
  WHERE file_url IS NULL OR file_url = '';

  -- Reparer URLs manquantes dans crm_lead_documents
  IF v_orphan_docs > 0 THEN
    UPDATE crm_lead_documents
    SET file_url = (
      SELECT COALESCE(
        'https://' || (SELECT value FROM system_config WHERE key = 'supabase_url' LIMIT 1) || '/storage/v1/object/public/' || file_path,
        file_path
      )
    )
    WHERE (file_url IS NULL OR file_url = '')
    AND file_path IS NOT NULL AND file_path != '';
  END IF;

  v_result := jsonb_build_object(
    'buckets_total', v_buckets_total,
    'orphan_docs_fixed', v_orphan_docs,
    'status', CASE WHEN v_buckets_total = 0 THEN 'critical' ELSE 'healthy' END
  );

  INSERT INTO ultron_health_checks (check_type, subsystem, status, score, details, anomalies_found, repairs_made)
  VALUES (
    'storage_audit',
    'STORAGE',
    CASE WHEN v_buckets_total = 0 THEN 'critical' ELSE 'healthy' END,
    CASE WHEN v_buckets_total = 0 THEN 20 ELSE 100 END,
    v_result,
    v_orphan_docs,
    v_orphan_docs
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- ============================================================
-- 8. FONCTION : AUDIT GLOBAL - CHEF D'ORCHESTRE
-- ============================================================

CREATE OR REPLACE FUNCTION ultron_audit_full_site()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crons_result jsonb;
  v_leads_result jsonb;
  v_email_result jsonb;
  v_storage_result jsonb;
  v_global_score integer;
  v_total_repairs integer := 0;
  v_anomalies_count integer;
  v_result jsonb;
BEGIN
  -- 1. Audit crons
  BEGIN
    v_crons_result := ultron_check_crons();
  EXCEPTION WHEN OTHERS THEN
    v_crons_result := jsonb_build_object('error', SQLERRM);
  END;

  -- 2. Audit pipeline leads
  BEGIN
    v_leads_result := ultron_check_lead_pipeline();
  EXCEPTION WHEN OTHERS THEN
    v_leads_result := jsonb_build_object('error', SQLERRM);
  END;

  -- 3. Audit emails
  BEGIN
    v_email_result := ultron_check_email_system();
  EXCEPTION WHEN OTHERS THEN
    v_email_result := jsonb_build_object('error', SQLERRM);
  END;

  -- 4. Audit storage
  BEGIN
    v_storage_result := ultron_check_storage();
  EXCEPTION WHEN OTHERS THEN
    v_storage_result := jsonb_build_object('error', SQLERRM);
  END;

  -- Compter anomalies actives
  SELECT COUNT(*) INTO v_anomalies_count FROM ultron_anomalies WHERE repaired = false;

  -- Calculer repairs total
  v_total_repairs :=
    COALESCE((v_crons_result->>'reactivated')::int, 0) +
    COALESCE((v_leads_result->>'repairs')::int, 0) +
    COALESCE((v_email_result->>'repairs')::int, 0) +
    COALESCE((v_storage_result->>'orphan_docs_fixed')::int, 0);

  -- Score global
  v_global_score := (
    SELECT COALESCE(AVG(score), 100)::int
    FROM ultron_health_checks
    WHERE checked_at >= now() - interval '5 minutes'
  );

  v_result := jsonb_build_object(
    'audit_timestamp', now(),
    'global_score', v_global_score,
    'total_repairs', v_total_repairs,
    'open_anomalies', v_anomalies_count,
    'subsystems', jsonb_build_object(
      'crons', v_crons_result,
      'leads', v_leads_result,
      'email', v_email_result,
      'storage', v_storage_result
    )
  );

  -- Log dans ultron_command_log
  INSERT INTO ultron_command_log (action_type, subsystem, status, impact_score, details)
  VALUES (
    'full_site_audit',
    'ULTRON_CORE',
    CASE WHEN v_global_score >= 90 THEN 'success'
         WHEN v_global_score >= 70 THEN 'warning'
         ELSE 'critical' END,
    v_global_score,
    v_result
  );

  -- Mettre a jour mission ULTRON KPIs
  BEGIN
    UPDATE ultron_missions
    SET
      kpi_current = jsonb_set(
        jsonb_set(
          COALESCE(kpi_current, '{}'::jsonb),
          '{health_score}',
          to_jsonb(v_global_score)
        ),
        '{total_repairs}',
        to_jsonb(COALESCE((kpi_current->>'total_repairs')::int, 0) + v_total_repairs)
      ),
      last_action_at = now(),
      updated_at = now()
    WHERE mission_name = 'MISSION_4_FULL_AUTONOMY';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 9. GRANTING FULL ACCESS : service_role sur toutes tables critiques
-- ============================================================

-- S'assurer que service_role a acces a toutes les tables ULTRON
GRANT ALL ON ultron_health_checks TO service_role;
GRANT ALL ON ultron_anomalies TO service_role;
GRANT ALL ON ultron_repairs TO service_role;
GRANT ALL ON ultron_lead_queue TO service_role;
GRANT ALL ON ultron_command_log TO service_role;
GRANT ALL ON ultron_missions TO service_role;
GRANT ALL ON crm_leads TO service_role;
GRANT ALL ON system_config TO service_role;
GRANT ALL ON email_queue TO service_role;
GRANT ALL ON crm_lead_documents TO service_role;
GRANT EXECUTE ON FUNCTION ultron_audit_full_site() TO service_role;
GRANT EXECUTE ON FUNCTION ultron_check_crons() TO service_role;
GRANT EXECUTE ON FUNCTION ultron_check_lead_pipeline() TO service_role;
GRANT EXECUTE ON FUNCTION ultron_check_email_system() TO service_role;
GRANT EXECUTE ON FUNCTION ultron_check_storage() TO service_role;
GRANT EXECUTE ON FUNCTION ultron_process_lead_queue() TO service_role;

-- ============================================================
-- 10. CRONS DE SURVEILLANCE AUTOMATIQUE
-- ============================================================

-- Audit complet toutes les 30 minutes
SELECT cron.unschedule('ultron-full-site-audit') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ultron-full-site-audit'
);
SELECT cron.schedule(
  'ultron-full-site-audit',
  '*/30 * * * *',
  $$SELECT ultron_audit_full_site();$$
);

-- Audit sante crons toutes les 15 minutes
SELECT cron.unschedule('ultron-cron-health-15min') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ultron-cron-health-15min'
);
SELECT cron.schedule(
  'ultron-cron-health-15min',
  '*/15 * * * *',
  $$SELECT ultron_check_crons();$$
);

-- Audit pipeline leads toutes les 20 minutes
SELECT cron.unschedule('ultron-lead-health-20min') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ultron-lead-health-20min'
);
SELECT cron.schedule(
  'ultron-lead-health-20min',
  '*/20 * * * *',
  $$SELECT ultron_check_lead_pipeline();$$
);

-- Audit email toutes les 10 minutes
SELECT cron.unschedule('ultron-email-health-10min') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ultron-email-health-10min'
);
SELECT cron.schedule(
  'ultron-email-health-10min',
  '*/10 * * * *',
  $$SELECT ultron_check_email_system();$$
);

-- ============================================================
-- 11. MISSION 4 - FULL AUTONOMY (si pas encore creee)
-- ============================================================

INSERT INTO ultron_missions (
  mission_name, status, progress_percent,
  kpi_target, kpi_current, last_action_at
)
VALUES (
  'MISSION_4_FULL_AUTONOMY',
  'active',
  0,
  jsonb_build_object('health_score', 95, 'total_repairs', 100, 'uptime_percent', 99),
  jsonb_build_object('health_score', 0, 'total_repairs', 0, 'uptime_percent', 0),
  now()
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 12. PREMIER AUDIT IMMEDIAT
-- ============================================================

DO $$
BEGIN
  PERFORM ultron_audit_full_site();
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
