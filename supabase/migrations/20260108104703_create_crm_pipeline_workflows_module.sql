/*
  # CRM TaxiAssur - Module Pipeline & Workflows

  ## Tables

  1. crm_state_transitions - Historique transitions d'état
  2. crm_workflows - Définitions de workflows automatisés
  3. crm_workflow_runs - Exécutions de workflows
  4. crm_tasks - Tâches manuelles assignées

  ## Sécurité

  - RLS activé
  - Policies par rôle
*/

-- ============================================================================
-- TABLES PIPELINE
-- ============================================================================

-- Table des transitions d'état
CREATE TABLE IF NOT EXISTS crm_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,

  -- Transition
  from_state lead_status NOT NULL,
  to_state lead_status NOT NULL,

  -- Origine de la transition
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('SYSTEM', 'AI', 'USER', 'WORKFLOW', 'EVENT')),
  triggered_by_user_id UUID REFERENCES admin_users(id),
  triggered_by_event_id UUID,

  -- Rationale
  reason TEXT,
  ai_decision_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  transitioned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_state_transitions_lead ON crm_state_transitions(lead_id);
CREATE INDEX IF NOT EXISTS idx_state_transitions_date ON crm_state_transitions(transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_state_transitions_from_to ON crm_state_transitions(from_state, to_state);

-- Table des workflows
CREATE TABLE IF NOT EXISTS crm_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Définition
  name TEXT NOT NULL,
  description TEXT,
  trigger_event event_type NOT NULL,
  conditions JSONB DEFAULT '{}'::jsonb,

  -- Configuration
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,

  -- Steps (actions séquentielles)
  steps JSONB NOT NULL,

  -- Metadata
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES admin_users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON crm_workflows(trigger_event) WHERE enabled = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflows_enabled ON crm_workflows(enabled) WHERE deleted_at IS NULL;

-- Table des exécutions de workflow
CREATE TABLE IF NOT EXISTS crm_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES crm_workflows(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,

  -- Exécution
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,

  -- Résultat
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON crm_workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_lead ON crm_workflow_runs(lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON crm_workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_date ON crm_workflow_runs(started_at DESC);

-- Table des tâches manuelles
CREATE TABLE IF NOT EXISTS crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Assignment
  assigned_to UUID NOT NULL REFERENCES admin_users(id),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,

  -- Tâche
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT CHECK (task_type IN ('CALL', 'EMAIL', 'MEETING', 'DOCUMENT_REVIEW', 'FOLLOW_UP', 'OTHER')),
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),

  -- Dates
  due_date TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ,

  -- Statut
  status TEXT DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES admin_users(id),

  -- Origine
  created_by UUID REFERENCES admin_users(id),
  ai_generated BOOLEAN DEFAULT false,
  ai_decision_id UUID,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON crm_tasks(assigned_to) WHERE status != 'COMPLETED';
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON crm_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON crm_tasks(due_date) WHERE status != 'COMPLETED';
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON crm_tasks(priority) WHERE status != 'COMPLETED';

-- RLS
ALTER TABLE crm_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins managers acces transitions"
  ON crm_state_transitions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('ADMIN', 'MANAGER')
    )
  );

CREATE POLICY "Utilisateurs voient taches assignées"
  ON crm_tasks FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY "Utilisateurs modifient taches assignées"
  ON crm_tasks FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid());

-- Triggers
CREATE TRIGGER update_crm_workflows_updated_at BEFORE UPDATE ON crm_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_tasks_updated_at BEFORE UPDATE ON crm_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed workflows essentiels
INSERT INTO crm_workflows (name, description, trigger_event, steps, enabled) VALUES
  (
    'Workflow Nouveau Lead',
    'Actions automatiques à la création d''un lead',
    'LEAD_CREATED',
    '[
      {"action": "SEND_MESSAGE", "channel": "EMAIL", "template": "LEAD_CONFIRMATION", "delay_minutes": 0},
      {"action": "CREATE_TASK", "type": "CALL", "title": "Appel de qualification", "delay_hours": 2},
      {"action": "SCHEDULE_FOLLOWUP", "delay_hours": 24}
    ]'::jsonb,
    true
  ),
  (
    'Workflow Relance 24h',
    'Relance automatique si pas de réponse sous 24h',
    'NO_RESPONSE_24H',
    '[
      {"action": "SEND_MESSAGE", "channel": "SMS", "template": "FOLLOWUP_24H"},
      {"action": "UPDATE_STATE", "new_state": "NO_RESPONSE"}
    ]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;

COMMENT ON TABLE crm_state_transitions IS 'Historique complet des transitions d''état avec traçabilité';
COMMENT ON TABLE crm_workflows IS 'Définitions de workflows automatisés event-driven';
COMMENT ON TABLE crm_workflow_runs IS 'Historique d''exécution des workflows';
COMMENT ON TABLE crm_tasks IS 'Tâches manuelles assignées aux utilisateurs';
