/*
  # Crons Moteur de Relances Automatiques

  1. Crons ajoutes
    - Relance devis toutes les 6 heures
    - Relance paiement toutes les 12 heures
    - Relance signature toutes les 8 heures
    - Relance leads inactifs quotidien a 10h

  2. Ameliorations
    - Ajout colonnes de suivi relances sur crm_quotes_sent
*/

-- Ajout colonnes suivi relances sur devis si necessaire
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_quotes_sent' AND column_name = 'reminder_count'
  ) THEN
    ALTER TABLE crm_quotes_sent ADD COLUMN reminder_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_quotes_sent' AND column_name = 'last_reminder_at'
  ) THEN
    ALTER TABLE crm_quotes_sent ADD COLUMN last_reminder_at timestamptz;
  END IF;
END $$;

-- Cron relance devis - Toutes les 6 heures (6h, 12h, 18h, 00h)
SELECT cron.schedule(
  'relance-devis-6h',
  '0 6,12,18,0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/relance-engine?action=quotes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Cron relance paiement comptant - Toutes les 12 heures (9h et 21h)
SELECT cron.schedule(
  'relance-paiement-12h',
  '0 9,21 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/relance-engine?action=payments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Cron relance signature - Toutes les 8 heures (8h, 16h, 00h)
SELECT cron.schedule(
  'relance-signature-8h',
  '0 8,16,0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/relance-engine?action=signatures',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Cron relance leads inactifs - Quotidien a 10h
SELECT cron.schedule(
  'relance-inactifs-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/relance-engine?action=inactive',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Ajout des regles d'automatisation correspondantes
INSERT INTO crm_automation_rules (id, name, description, category, trigger_type, trigger_conditions, actions, is_active, priority, execution_count, success_count) VALUES
(gen_random_uuid(), 'Relance Devis Automatique', 'Rappel automatique pour les devis en attente', 'relance', 'schedule', '{"schedule": "0 6,12,18,0 * * *"}', '{"action": "relance_quotes"}', true, 85, 0, 0),
(gen_random_uuid(), 'Relance Paiement Comptant', 'Rappel pour les paiements comptant en attente', 'relance', 'schedule', '{"schedule": "0 9,21 * * *"}', '{"action": "relance_payments"}', true, 90, 0, 0),
(gen_random_uuid(), 'Relance Signature Contrat', 'Rappel pour les signatures en attente', 'relance', 'schedule', '{"schedule": "0 8,16,0 * * *"}', '{"action": "relance_signatures"}', true, 88, 0, 0),
(gen_random_uuid(), 'Relance Leads Inactifs', 'Relance quotidienne des leads sans activite', 'relance', 'schedule', '{"schedule": "0 10 * * *"}', '{"action": "relance_inactive"}', true, 75, 0, 0)
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN crm_quotes_sent.reminder_count IS 'Nombre de relances envoyees pour ce devis';
COMMENT ON COLUMN crm_quotes_sent.last_reminder_at IS 'Date de la derniere relance envoyee';
