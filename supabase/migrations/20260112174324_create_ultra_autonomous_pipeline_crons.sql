/*
  # Crons Pipeline IA Ultra-Autonome

  1. Crons ajoutes
    - Orchestrateur pipeline toutes les 5 minutes
    - Collecteur documents toutes les 15 minutes
    - Verification documents toutes les heures
    - Alertes dossiers prets toutes les 30 minutes
*/

-- Orchestrateur pipeline IA - Toutes les 5 minutes
SELECT cron.schedule(
  'pipeline-ia-orchestrator-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/pipeline-ia-orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Collecteur documents - Toutes les 15 minutes
SELECT cron.schedule(
  'document-collector-ia-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/document-collector-ia',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"action": "all"}'::jsonb
  );
  $$
);

-- Alertes dossiers prets pour devis - Toutes les 30 minutes
SELECT cron.schedule(
  'alert-ready-for-quote-30min',
  '*/30 * * * *',
  $$
  INSERT INTO notification_queue (
    recipient_id,
    notification_type,
    channel,
    subject,
    content,
    priority
  )
  SELECT 
    au.id,
    'ready_for_quote',
    'email',
    'Nouveaux dossiers prets pour devis',
    'Il y a ' || COUNT(*) || ' dossier(s) complet(s) en attente de devis.',
    'high'
  FROM ready_for_quote_queue rfq
  CROSS JOIN admin_users au
  WHERE rfq.status = 'waiting'
    AND au.role IN ('admin', 'commercial')
    AND au.is_active = true
  GROUP BY au.id
  HAVING COUNT(*) > 0
  ON CONFLICT DO NOTHING;
  $$
);

-- Nettoyage taches executees - Quotidien a 3h
SELECT cron.schedule(
  'cleanup-completed-tasks-daily',
  '0 3 * * *',
  $$
  DELETE FROM ai_autonomous_tasks 
  WHERE status IN ('completed', 'cancelled') 
    AND executed_at < now() - interval '7 days';
  $$
);

-- Mise a jour stats automations CRM - Toutes les heures
SELECT cron.schedule(
  'update-automation-stats-hourly',
  '0 * * * *',
  $$
  UPDATE crm_automation_rules 
  SET execution_count = (
    SELECT COUNT(*) FROM ai_autonomous_tasks 
    WHERE task_type = crm_automation_rules.trigger_type 
      AND status = 'completed'
  ),
  success_count = (
    SELECT COUNT(*) FROM ai_autonomous_tasks 
    WHERE task_type = crm_automation_rules.trigger_type 
      AND status = 'completed'
      AND (execution_result->>'success')::boolean = true
  ),
  last_executed_at = (
    SELECT MAX(executed_at) FROM ai_autonomous_tasks 
    WHERE task_type = crm_automation_rules.trigger_type 
      AND status = 'completed'
  ),
  updated_at = now()
  WHERE is_active = true;
  $$
);

-- Ajouter les nouvelles regles d'automatisation
INSERT INTO crm_automation_rules (id, name, description, category, trigger_type, trigger_conditions, actions, is_active, priority, execution_count, success_count) VALUES
(gen_random_uuid(), 'Orchestrateur Pipeline IA', 'Execution automatique du pipeline toutes les 5 min', 'pipeline', 'schedule', '{"schedule": "*/5 * * * *"}', '{"action": "execute_pipeline_tasks"}', true, 100, 0, 0),
(gen_random_uuid(), 'Collecteur Documents IA', 'Verification et rappels documents automatiques', 'documents', 'schedule', '{"schedule": "*/15 * * * *"}', '{"action": "collect_verify_documents"}', true, 95, 0, 0),
(gen_random_uuid(), 'Alertes Dossiers Complets', 'Notification quand dossier pret pour devis', 'alerts', 'schedule', '{"schedule": "*/30 * * * *"}', '{"action": "alert_ready_quotes"}', true, 90, 0, 0),
(gen_random_uuid(), 'Progression Auto Etapes', 'Avancement automatique dans le pipeline', 'pipeline', 'event', '{"event": "stage_timeout"}', '{"action": "auto_advance_stage"}', true, 85, 0, 0),
(gen_random_uuid(), 'Qualification IA Nouveau Lead', 'Qualification automatique des nouveaux leads', 'leads', 'event', '{"event": "new_lead"}', '{"action": "ai_qualify_lead"}', true, 100, 0, 0),
(gen_random_uuid(), 'Email Bienvenue Automatique', 'Envoi immediat email de bienvenue', 'email', 'event', '{"event": "new_lead"}', '{"action": "send_welcome_email"}', true, 100, 0, 0),
(gen_random_uuid(), 'SMS Bienvenue Automatique', 'Envoi SMS 5 min apres inscription', 'sms', 'event', '{"event": "new_lead", "delay": 5}', '{"action": "send_welcome_sms"}', true, 95, 0, 0),
(gen_random_uuid(), 'Demande Documents Auto', 'Envoi automatique liste documents requis', 'documents', 'event', '{"event": "stage_document_collection"}', '{"action": "request_documents"}', true, 90, 0, 0),
(gen_random_uuid(), 'Verification Documents IA', 'Validation automatique des documents recus', 'documents', 'event', '{"event": "document_uploaded"}', '{"action": "verify_document"}', true, 85, 0, 0),
(gen_random_uuid(), 'Notification Dossier Complet', 'Alerte agent quand dossier pret', 'alerts', 'event', '{"event": "documents_complete"}', '{"action": "notify_ready_for_quote"}', true, 100, 0, 0),
(gen_random_uuid(), 'Suivi Devis Envoye', 'Relance automatique apres envoi devis', 'email', 'event', '{"event": "quote_sent", "delay_hours": 24}', '{"action": "followup_quote"}', true, 80, 0, 0),
(gen_random_uuid(), 'Gestion Objections IA', 'Reponse automatique aux objections', 'ai', 'event', '{"event": "objection_detected"}', '{"action": "ai_handle_objection"}', true, 75, 0, 0),
(gen_random_uuid(), 'Rappel Signature Contrat', 'Relance pour signature electronique', 'email', 'event', '{"event": "contract_sent", "delay_hours": 24}', '{"action": "remind_signature"}', true, 70, 0, 0),
(gen_random_uuid(), 'Onboarding Client Gagne', 'Envoi welcome pack automatique', 'email', 'event', '{"event": "deal_won"}', '{"action": "send_welcome_pack"}', true, 100, 0, 0)
ON CONFLICT DO NOTHING;