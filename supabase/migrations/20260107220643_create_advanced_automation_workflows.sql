/*
  # Système Workflows Automatisation Complexes

  1. Tables
    - automation_workflows - Workflows définis
    - workflow_steps - Étapes individuelles
    - workflow_executions - Exécutions en cours
    - workflow_triggers - Déclencheurs

  2. Features
    - Drip campaigns multi-étapes
    - Conditions complexes (IF/ELSE)
    - Délais dynamiques
    - A/B testing intégré
    - Actions multi-canaux (email, SMS, task)
*/

CREATE TABLE IF NOT EXISTS automation_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  workflow_type text NOT NULL, -- drip_campaign, nurturing, onboarding, reactivation
  trigger_type text NOT NULL, -- lead_created, tag_added, behavior, schedule, api
  trigger_config jsonb NOT NULL,
  is_active boolean DEFAULT false,
  enrollment_count int DEFAULT 0,
  completion_count int DEFAULT 0,
  completion_rate numeric(5,2),
  avg_completion_time_hours int,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES automation_workflows(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  step_type text NOT NULL, -- email, sms, wait, condition, action, ab_test
  step_name text NOT NULL,
  config jsonb NOT NULL,
  delay_value int, -- Délai avant exécution
  delay_unit text, -- minutes, hours, days
  condition_logic jsonb, -- Pour étapes conditionnelles
  parent_step_id uuid REFERENCES workflow_steps(id), -- Pour branches IF/ELSE
  branch_type text, -- true_branch, false_branch
  is_active boolean DEFAULT true,
  execution_count int DEFAULT 0,
  success_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES automation_workflows(id),
  lead_id uuid REFERENCES leads(id),
  current_step_id uuid REFERENCES workflow_steps(id),
  status text DEFAULT 'active', -- active, paused, completed, failed, cancelled
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  execution_data jsonb DEFAULT '{}'::jsonb, -- Variables de contexte
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_step_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_id uuid REFERENCES workflow_steps(id),
  status text DEFAULT 'pending', -- pending, scheduled, executing, completed, failed, skipped
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  result jsonb,
  error_message text,
  retry_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES automation_workflows(id),
  trigger_event text NOT NULL,
  filter_conditions jsonb,
  is_active boolean DEFAULT true,
  trigger_count int DEFAULT 0,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_workflows_active ON automation_workflows(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_lead ON workflow_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_execution ON workflow_step_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_scheduled ON workflow_step_executions(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_workflow ON workflow_triggers(workflow_id);

-- RLS
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage workflows" ON automation_workflows FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "Users view active workflows" ON automation_workflows FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage steps" ON workflow_steps FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "Users view active steps" ON workflow_steps FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Users view executions of accessible leads" ON workflow_executions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = workflow_executions.lead_id));
CREATE POLICY "System manage executions" ON workflow_executions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "Users view step executions" ON workflow_step_executions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM workflow_executions WHERE workflow_executions.id = workflow_step_executions.execution_id));
CREATE POLICY "System manage step executions" ON workflow_step_executions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "Admins manage triggers" ON workflow_triggers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- Insérer workflows par défaut
INSERT INTO automation_workflows (name, description, workflow_type, trigger_type, trigger_config) VALUES
(
  'Onboarding Nouveaux Leads',
  'Séquence d''accueil automatique pour nouveaux prospects',
  'onboarding',
  'lead_created',
  '{"immediate": true}'::jsonb
),
(
  'Nurturing 30 Jours',
  'Campagne de maturation sur 30 jours',
  'nurturing',
  'tag_added',
  '{"tag": "nurturing_30d"}'::jsonb
),
(
  'Réactivation Inactifs',
  'Réengagement des leads inactifs depuis 60+ jours',
  'reactivation',
  'schedule',
  '{"cron": "0 9 * * 1", "filter": "last_activity > 60 days"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Insérer étapes exemple pour workflow onboarding
DO $$
DECLARE
  v_workflow_id uuid;
BEGIN
  SELECT id INTO v_workflow_id FROM automation_workflows WHERE name = 'Onboarding Nouveaux Leads' LIMIT 1;
  
  IF v_workflow_id IS NOT NULL THEN
    INSERT INTO workflow_steps (workflow_id, step_order, step_type, step_name, config, delay_value, delay_unit) VALUES
    (v_workflow_id, 1, 'email', 'Email Bienvenue', '{"template": "welcome_new_lead", "subject": "Bienvenue chez TaxiAssur"}'::jsonb, 0, 'minutes'),
    (v_workflow_id, 2, 'wait', 'Attendre 24h', '{}'::jsonb, 24, 'hours'),
    (v_workflow_id, 3, 'condition', 'A ouvert l''email ?', '{"condition": "email_opened = true"}'::jsonb, 0, 'minutes'),
    (v_workflow_id, 4, 'email', 'Email Relance Engagés', '{"template": "follow_up_engaged"}'::jsonb, 0, 'minutes'),
    (v_workflow_id, 5, 'email', 'Email Relance Non-Engagés', '{"template": "follow_up_cold"}'::jsonb, 0, 'minutes'),
    (v_workflow_id, 6, 'wait', 'Attendre 3 jours', '{}'::jsonb, 3, 'days'),
    (v_workflow_id, 7, 'sms', 'SMS Relance', '{"message": "Besoin d''aide pour votre assurance taxi ?"}'::jsonb, 0, 'minutes'),
    (v_workflow_id, 8, 'action', 'Créer tâche de suivi', '{"action": "create_task", "assignee": "auto"}'::jsonb, 0, 'minutes');
  END IF;
END $$;

-- Fonction pour enrôler un lead dans un workflow
CREATE OR REPLACE FUNCTION enroll_in_workflow(
  p_lead_id uuid,
  p_workflow_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_execution_id uuid;
  v_first_step_id uuid;
BEGIN
  -- Vérifier que le workflow est actif
  IF NOT EXISTS (SELECT 1 FROM automation_workflows WHERE id = p_workflow_id AND is_active = true) THEN
    RAISE EXCEPTION 'Workflow not active';
  END IF;
  
  -- Vérifier si déjà enrôlé
  IF EXISTS (SELECT 1 FROM workflow_executions WHERE lead_id = p_lead_id AND workflow_id = p_workflow_id AND status = 'active') THEN
    RAISE EXCEPTION 'Lead already enrolled';
  END IF;
  
  -- Récupérer la première étape
  SELECT id INTO v_first_step_id
  FROM workflow_steps
  WHERE workflow_id = p_workflow_id
  ORDER BY step_order ASC
  LIMIT 1;
  
  -- Créer l'exécution
  INSERT INTO workflow_executions (workflow_id, lead_id, current_step_id, status)
  VALUES (p_workflow_id, p_lead_id, v_first_step_id, 'active')
  RETURNING id INTO v_execution_id;
  
  -- Mettre à jour le compteur
  UPDATE automation_workflows
  SET enrollment_count = enrollment_count + 1
  WHERE id = p_workflow_id;
  
  RETURN v_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
