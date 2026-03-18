/*
  # Correction de tous les crons en echec - 18 mars 2026

  ## Probleme identifie
  La grande majorite des crons importants echouent a chaque execution avec :
  - `unrecognized configuration parameter "app.settings.supabase_url"` 
  - `unrecognized configuration parameter "app.supabase_url"`
  - Tables inexistantes (leads, crm_leads_enhanced, secrets)
  - Colonne inexistante (recipient_id dans notification_queue)

  ## Solution
  Remplacer tous les appels `current_setting('app.*.supabase_url')` par 
  `get_system_setting('supabase_url')` qui fonctionne correctement.

  ## Crons corriges
  1. process-pipeline-actions
  2. pipeline-ia-orchestrator-5min
  3. sync-ionos-emails-intake
  4. fetch-team-emails-auto
  5. fetch-email-replies-hourly
  6. parse-form-emails-create-leads-auto
  7. document-collector-ia-15min
  8. ai_master_hourly_execution
  9. emergency_lead_recovery_hourly
  10. pipeline_automation_hourly
  11. realtime_monitoring_engine
  12. ultra_autonomous_self_healer
  13. unified_city_generator
  14. git-auto-publish-every-10min
  15. send-backlink-outreach-emails
  16. recalculate_lead_scores (crm_leads_enhanced -> crm_leads)
  17. alert-ready-for-quote-30min (colonne recipient_id -> recipient)
  18. detect_lead_drought() (table leads -> crm_leads)
*/

-- 1. process-pipeline-actions (chaque minute)
SELECT cron.alter_job(
  job_id := 444,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/pipeline-action-executor',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key')),
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object('action', 'process_queue', 'limit', 20),
  timeout_milliseconds := 25000
);
$cmd$
);

-- 2. pipeline-ia-orchestrator-5min
SELECT cron.alter_job(
  job_id := 430,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/pipeline-ia-orchestrator',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 25000
);
$cmd$
);

-- 3. sync-ionos-emails-intake (toutes les 5 min)
SELECT cron.alter_job(
  job_id := 448,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/sync-ionos-imap-documents',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key')),
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 55000
);
$cmd$
);

-- 4. fetch-team-emails-auto (toutes les 15 min)
SELECT cron.alter_job(
  job_id := 411,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/fetch-email-replies',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 55000
);
$cmd$
);

-- 5. fetch-email-replies-hourly
SELECT cron.alter_job(
  job_id := 410,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/fetch-email-replies',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 55000
) AS request_id;
$cmd$
);

-- 6. parse-form-emails-create-leads-auto (toutes les 5 min)
SELECT cron.alter_job(
  job_id := 455,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/parse-form-emails-create-leads',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := jsonb_build_object(),
  timeout_milliseconds := 30000
);
$cmd$
);

-- 7. document-collector-ia-15min
SELECT cron.alter_job(
  job_id := 431,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/document-collector-ia',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := '{"action": "all"}'::jsonb,
  timeout_milliseconds := 55000
);
$cmd$
);

-- 8. ai_master_hourly_execution
SELECT cron.alter_job(
  job_id := 385,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/master-ai-decision-engine',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 55000
);
$cmd$
);

-- 9. emergency_lead_recovery_hourly
SELECT cron.alter_job(
  job_id := 390,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/emergency-lead-recovery',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 55000
);
$cmd$
);

-- 10. pipeline_automation_hourly
SELECT cron.alter_job(
  job_id := 407,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/pipeline-automation-engine',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 55000
);
$cmd$
);

-- 11. realtime_monitoring_engine (toutes les 5 min)
SELECT cron.alter_job(
  job_id := 399,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/realtime-monitoring-engine',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 55000
);
$cmd$
);

-- 12. ultra_autonomous_self_healer (toutes les 15 min)
SELECT cron.alter_job(
  job_id := 398,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/ultra-autonomous-self-healer',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 55000
);
$cmd$
);

-- 13. unified_city_generator (utilise table "secrets" qui n'existe pas)
SELECT cron.alter_job(
  job_id := 425,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/auto-generate-city-page',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key')),
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object('unified', true),
  timeout_milliseconds := 55000
);
$cmd$
);

-- 14. git-auto-publish-every-10min
SELECT cron.alter_job(
  job_id := 480,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/git-auto-publisher',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key'))
  ),
  body := jsonb_build_object('trigger', 'cron', 'timestamp', now()),
  timeout_milliseconds := 30000
);
$cmd$
);

-- 15. send-backlink-outreach-emails
SELECT cron.alter_job(
  job_id := 335,
  command := $cmd$
SELECT net.http_post(
  url := (SELECT get_system_setting('supabase_url')) || '/functions/v1/send-backlink-email-brevo',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (SELECT get_system_setting('supabase_service_role_key')),
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object('limit', 5),
  timeout_milliseconds := 30000
);
$cmd$
);

-- 16. recalculate_lead_scores (crm_leads_enhanced n'existe pas -> utilise crm_leads)
SELECT cron.alter_job(
  job_id := 392,
  command := $cmd$
SELECT calculate_lead_score(id)
FROM crm_leads
WHERE stage NOT IN ('contrat_signe', 'perdu', 'Contrat Signé', 'Perdu');
$cmd$
);

-- 17. alert-ready-for-quote-30min (colonne recipient_id -> recipient)
SELECT cron.alter_job(
  job_id := 432,
  command := $cmd$
INSERT INTO notification_queue (
  lead_id,
  channel,
  recipient,
  template_key,
  variables,
  priority
)
SELECT
  rfq.lead_id,
  'email',
  au.email,
  'ready_for_quote',
  jsonb_build_object('count', COUNT(*) OVER (), 'commercial_name', au.full_name),
  'high'
FROM ready_for_quote_queue rfq
CROSS JOIN admin_users au
WHERE rfq.status = 'waiting'
AND au.role IN ('admin', 'commercial')
AND au.is_active = true
LIMIT 1
ON CONFLICT DO NOTHING;
$cmd$
);

-- 18. Corriger detect_lead_drought() pour utiliser crm_leads au lieu de leads
CREATE OR REPLACE FUNCTION public.detect_lead_drought()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  last_lead timestamptz;
  hours_since integer;
  drought_detected boolean := false;
  result jsonb;
BEGIN
  SELECT MAX(created_at) INTO last_lead FROM crm_leads;

  IF last_lead IS NULL THEN
    hours_since := 999;
    drought_detected := true;
  ELSE
    hours_since := EXTRACT(EPOCH FROM (NOW() - last_lead)) / 3600;
    IF hours_since > 6 THEN
      drought_detected := true;
    END IF;
  END IF;

  IF drought_detected THEN
    INSERT INTO lead_drought_alerts (
      alert_type,
      hours_without_leads,
      last_lead_timestamp,
      status
    ) VALUES (
      CASE
        WHEN hours_since > 48 THEN 'CRITICAL_EMERGENCY'
        WHEN hours_since > 24 THEN 'HIGH_PRIORITY'
        ELSE 'WARNING'
      END,
      hours_since,
      last_lead,
      'active'
    );
  END IF;

  result := jsonb_build_object(
    'drought_detected', drought_detected,
    'hours_since_last_lead', hours_since,
    'last_lead_timestamp', last_lead,
    'severity', CASE
      WHEN hours_since > 48 THEN 'CRITICAL'
      WHEN hours_since > 24 THEN 'HIGH'
      WHEN hours_since > 6 THEN 'MEDIUM'
      ELSE 'LOW'
    END
  );

  RETURN result;
END;
$function$;
