/*
  # Systeme Pipeline IA Ultra-Autonome

  1. Nouvelles Tables
    - `pipeline_stages` : Etapes du funnel avec actions automatiques
    - `lead_journey` : Historique complet du parcours lead
    - `ai_autonomous_tasks` : Taches IA a executer
    - `document_collection_status` : Suivi collecte documents
    - `ready_for_quote_queue` : File des dossiers prets pour devis

  2. Ameliorations
    - Ajout colonnes automatisation sur crm_leads
    - Triggers automatiques de progression
    - Systeme de scoring dynamique

  3. Objectif
    - Pipeline 100% autonome jusqu'au devis
    - Humain intervient UNIQUEMENT pour devis + contrat
*/

-- Table des etapes du pipeline avec actions automatiques
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_order integer NOT NULL,
  stage_key text UNIQUE NOT NULL,
  stage_name text NOT NULL,
  description text,
  is_automated boolean DEFAULT true,
  requires_human boolean DEFAULT false,
  auto_actions jsonb DEFAULT '[]',
  required_documents text[] DEFAULT '{}',
  max_duration_hours integer DEFAULT 48,
  escalation_actions jsonb DEFAULT '[]',
  next_stage_conditions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Insertion des etapes du pipeline autonome
INSERT INTO pipeline_stages (stage_order, stage_key, stage_name, description, is_automated, requires_human, auto_actions, required_documents, max_duration_hours, next_stage_conditions) VALUES
(1, 'new_lead', 'Nouveau Lead', 'Lead vient d arriver - Qualification automatique', true, false, 
  '[{"action": "send_welcome_email", "delay_minutes": 0}, {"action": "send_welcome_sms", "delay_minutes": 5}, {"action": "ai_qualify_lead", "delay_minutes": 1}, {"action": "assign_to_agent", "delay_minutes": 2}]',
  '{}', 1, '{"auto_advance": true, "condition": "qualification_complete"}'),

(2, 'qualification', 'Qualification IA', 'Analyse IA du profil et besoins', true, false,
  '[{"action": "analyze_profile", "delay_minutes": 0}, {"action": "calculate_risk_score", "delay_minutes": 1}, {"action": "suggest_best_offers", "delay_minutes": 2}, {"action": "send_personalized_info", "delay_minutes": 10}]',
  '{}', 2, '{"auto_advance": true, "condition": "profile_analyzed"}'),

(3, 'first_contact', 'Premier Contact', 'Contact initial automatise', true, false,
  '[{"action": "send_presentation_email", "delay_minutes": 0}, {"action": "schedule_callback_sms", "delay_minutes": 30}, {"action": "send_whatsapp_intro", "delay_minutes": 60}]',
  '{}', 24, '{"auto_advance": true, "condition": "contact_responded", "fallback_advance_hours": 24}'),

(4, 'needs_analysis', 'Analyse Besoins', 'Collecte informations detaillees', true, false,
  '[{"action": "send_needs_questionnaire", "delay_minutes": 0}, {"action": "ai_analyze_responses", "delay_minutes": 1}, {"action": "request_missing_info", "delay_minutes": 60}]',
  '{}', 48, '{"auto_advance": true, "condition": "needs_collected"}'),

(5, 'document_collection', 'Collecte Documents', 'Demande et suivi des pieces', true, false,
  '[{"action": "send_document_request", "delay_minutes": 0}, {"action": "send_reminder_24h", "delay_hours": 24}, {"action": "send_reminder_48h", "delay_hours": 48}, {"action": "send_urgent_reminder", "delay_hours": 72}, {"action": "offer_assistance", "delay_hours": 96}]',
  ARRAY['carte_grise', 'permis_conduire', 'carte_pro_taxi', 'releve_information', 'kbis'],
  168, '{"auto_advance": true, "condition": "all_documents_received"}'),

(6, 'document_verification', 'Verification Documents', 'Validation IA des documents', true, false,
  '[{"action": "ai_verify_documents", "delay_minutes": 0}, {"action": "flag_issues", "delay_minutes": 5}, {"action": "request_corrections", "delay_minutes": 10}]',
  '{}', 4, '{"auto_advance": true, "condition": "documents_validated"}'),

(7, 'dossier_complete', 'Dossier Complet', 'Preparation finale du dossier', true, false,
  '[{"action": "compile_dossier", "delay_minutes": 0}, {"action": "generate_summary", "delay_minutes": 1}, {"action": "notify_agent_ready", "delay_minutes": 2}, {"action": "add_to_quote_queue", "delay_minutes": 3}]',
  '{}', 1, '{"auto_advance": false, "requires_human_action": "create_quote"}'),

(8, 'quote_pending', 'Attente Devis', 'HUMAIN: Creation du devis', false, true,
  '[{"action": "alert_urgent_if_waiting", "delay_hours": 4}]',
  '{}', 24, '{"requires_human_action": "send_quote"}'),

(9, 'quote_sent', 'Devis Envoye', 'Suivi automatique du devis', true, false,
  '[{"action": "send_quote_email", "delay_minutes": 0}, {"action": "send_quote_sms", "delay_minutes": 5}, {"action": "schedule_followup", "delay_hours": 24}, {"action": "ai_handle_objections", "delay_hours": 48}]',
  '{}', 72, '{"auto_advance": true, "condition": "quote_accepted"}'),

(10, 'negotiation', 'Negociation', 'Gestion automatique des objections', true, false,
  '[{"action": "ai_respond_objections", "delay_minutes": 5}, {"action": "offer_alternatives", "delay_hours": 24}, {"action": "final_offer", "delay_hours": 48}]',
  '{}', 96, '{"auto_advance": true, "condition": "agreement_reached"}'),

(11, 'contract_pending', 'Attente Contrat', 'HUMAIN: Emission du contrat', false, true,
  '[{"action": "prepare_contract_data", "delay_minutes": 0}, {"action": "alert_for_contract", "delay_minutes": 5}]',
  '{}', 24, '{"requires_human_action": "emit_contract"}'),

(12, 'signature_pending', 'Signature', 'Collecte signature electronique', true, false,
  '[{"action": "send_contract_for_signature", "delay_minutes": 0}, {"action": "reminder_signature", "delay_hours": 24}, {"action": "urgent_signature_reminder", "delay_hours": 48}]',
  '{}', 72, '{"auto_advance": true, "condition": "contract_signed"}'),

(13, 'payment_pending', 'Paiement', 'Collecte du paiement', true, false,
  '[{"action": "send_payment_link", "delay_minutes": 0}, {"action": "payment_reminder", "delay_hours": 24}]',
  '{}', 48, '{"auto_advance": true, "condition": "payment_received"}'),

(14, 'won', 'Gagne', 'Client converti - Onboarding', true, false,
  '[{"action": "send_welcome_pack", "delay_minutes": 0}, {"action": "send_attestation", "delay_minutes": 5}, {"action": "schedule_satisfaction_survey", "delay_days": 7}]',
  '{}', 0, '{}')

ON CONFLICT (stage_key) DO UPDATE SET
  auto_actions = EXCLUDED.auto_actions,
  required_documents = EXCLUDED.required_documents,
  next_stage_conditions = EXCLUDED.next_stage_conditions;

-- Table du parcours lead (historique complet)
CREATE TABLE IF NOT EXISTS lead_journey (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  stage_key text REFERENCES pipeline_stages(stage_key),
  entered_at timestamptz DEFAULT now(),
  exited_at timestamptz,
  duration_minutes integer,
  actions_executed jsonb DEFAULT '[]',
  ai_decisions jsonb DEFAULT '[]',
  human_interventions jsonb DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_journey_lead_id ON lead_journey(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_journey_stage ON lead_journey(stage_key);

-- Table des taches IA autonomes
CREATE TABLE IF NOT EXISTS ai_autonomous_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  task_action text NOT NULL,
  priority integer DEFAULT 50,
  scheduled_at timestamptz NOT NULL,
  executed_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'cancelled')),
  execution_result jsonb,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_tasks_scheduled ON ai_autonomous_tasks(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ai_tasks_lead ON ai_autonomous_tasks(lead_id);

-- Table statut collecte documents
CREATE TABLE IF NOT EXISTS document_collection_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE UNIQUE,
  required_documents jsonb DEFAULT '[]',
  received_documents jsonb DEFAULT '[]',
  verified_documents jsonb DEFAULT '[]',
  missing_documents jsonb DEFAULT '[]',
  completion_percentage integer DEFAULT 0,
  last_reminder_sent timestamptz,
  reminder_count integer DEFAULT 0,
  is_complete boolean DEFAULT false,
  verified_by_ai boolean DEFAULT false,
  ai_verification_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_status_lead ON document_collection_status(lead_id);
CREATE INDEX IF NOT EXISTS idx_doc_status_incomplete ON document_collection_status(is_complete) WHERE is_complete = false;

-- File des dossiers prets pour devis (alerte humain)
CREATE TABLE IF NOT EXISTS ready_for_quote_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  priority_score integer DEFAULT 50,
  estimated_value decimal(10,2),
  dossier_summary jsonb,
  recommended_companies text[],
  ai_risk_assessment jsonb,
  documents_verified boolean DEFAULT false,
  added_at timestamptz DEFAULT now(),
  claimed_by uuid REFERENCES admin_users(id),
  claimed_at timestamptz,
  quote_created_at timestamptz,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'claimed', 'in_progress', 'quote_sent', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_quote_queue_status ON ready_for_quote_queue(status, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_quote_queue_waiting ON ready_for_quote_queue(added_at) WHERE status = 'waiting';

-- Ajout colonnes sur crm_leads pour autonomie
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'current_stage_key') THEN
    ALTER TABLE crm_leads ADD COLUMN current_stage_key text DEFAULT 'new_lead';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'stage_entered_at') THEN
    ALTER TABLE crm_leads ADD COLUMN stage_entered_at timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'ai_qualification_score') THEN
    ALTER TABLE crm_leads ADD COLUMN ai_qualification_score integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'ai_risk_level') THEN
    ALTER TABLE crm_leads ADD COLUMN ai_risk_level text DEFAULT 'medium';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'auto_actions_count') THEN
    ALTER TABLE crm_leads ADD COLUMN auto_actions_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'last_auto_action_at') THEN
    ALTER TABLE crm_leads ADD COLUMN last_auto_action_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'needs_human_intervention') THEN
    ALTER TABLE crm_leads ADD COLUMN needs_human_intervention boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'human_intervention_reason') THEN
    ALTER TABLE crm_leads ADD COLUMN human_intervention_reason text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'documents_complete') THEN
    ALTER TABLE crm_leads ADD COLUMN documents_complete boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'ready_for_quote') THEN
    ALTER TABLE crm_leads ADD COLUMN ready_for_quote boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'quote_sent_at') THEN
    ALTER TABLE crm_leads ADD COLUMN quote_sent_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'contract_sent_at') THEN
    ALTER TABLE crm_leads ADD COLUMN contract_sent_at timestamptz;
  END IF;
END $$;

-- Fonction pour avancer automatiquement dans le pipeline
CREATE OR REPLACE FUNCTION advance_lead_stage(
  p_lead_id uuid,
  p_new_stage text,
  p_ai_decision jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stage text;
  v_entered_at timestamptz;
BEGIN
  SELECT current_stage_key, stage_entered_at INTO v_current_stage, v_entered_at
  FROM crm_leads WHERE id = p_lead_id;
  
  IF v_current_stage IS DISTINCT FROM p_new_stage THEN
    -- Fermer l'etape actuelle dans le journey
    UPDATE lead_journey
    SET exited_at = now(),
        duration_minutes = EXTRACT(EPOCH FROM (now() - entered_at)) / 60
    WHERE lead_id = p_lead_id AND stage_key = v_current_stage AND exited_at IS NULL;
    
    -- Creer nouvelle entree journey
    INSERT INTO lead_journey (lead_id, stage_key, ai_decisions)
    VALUES (p_lead_id, p_new_stage, p_ai_decision);
    
    -- Mettre a jour le lead
    UPDATE crm_leads
    SET current_stage_key = p_new_stage,
        stage_entered_at = now(),
        updated_at = now()
    WHERE id = p_lead_id;
    
    -- Logger la decision IA
    INSERT INTO ai_decisions (lead_id, decision_type, decision_data, confidence_score)
    VALUES (p_lead_id, 'stage_advance', jsonb_build_object('from', v_current_stage, 'to', p_new_stage, 'reason', p_ai_decision), 0.95);
  END IF;
END;
$$;

-- Fonction pour planifier les actions automatiques
CREATE OR REPLACE FUNCTION schedule_stage_actions(p_lead_id uuid, p_stage_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actions jsonb;
  v_action jsonb;
BEGIN
  SELECT auto_actions INTO v_actions
  FROM pipeline_stages WHERE stage_key = p_stage_key;
  
  IF v_actions IS NOT NULL THEN
    FOR v_action IN SELECT * FROM jsonb_array_elements(v_actions)
    LOOP
      INSERT INTO ai_autonomous_tasks (lead_id, task_type, task_action, scheduled_at, priority)
      VALUES (
        p_lead_id,
        p_stage_key,
        v_action->>'action',
        now() + (COALESCE((v_action->>'delay_minutes')::int, 0) * interval '1 minute')
             + (COALESCE((v_action->>'delay_hours')::int, 0) * interval '1 hour')
             + (COALESCE((v_action->>'delay_days')::int, 0) * interval '1 day'),
        COALESCE((v_action->>'priority')::int, 50)
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

-- Trigger pour planifier actions sur changement de stage
CREATE OR REPLACE FUNCTION trigger_schedule_stage_actions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.current_stage_key IS DISTINCT FROM OLD.current_stage_key OR TG_OP = 'INSERT' THEN
    PERFORM schedule_stage_actions(NEW.id, NEW.current_stage_key);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schedule_stage_actions ON crm_leads;
CREATE TRIGGER trg_schedule_stage_actions
  AFTER INSERT OR UPDATE OF current_stage_key ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_schedule_stage_actions();

-- Fonction pour verifier si dossier complet et pret pour devis
CREATE OR REPLACE FUNCTION check_lead_ready_for_quote(p_lead_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_docs_complete boolean;
  v_docs_verified boolean;
BEGIN
  SELECT is_complete, verified_by_ai INTO v_docs_complete, v_docs_verified
  FROM document_collection_status WHERE lead_id = p_lead_id;
  
  IF v_docs_complete AND v_docs_verified THEN
    UPDATE crm_leads
    SET ready_for_quote = true,
        needs_human_intervention = true,
        human_intervention_reason = 'Dossier complet - Pret pour devis',
        current_stage_key = 'dossier_complete'
    WHERE id = p_lead_id;
    
    -- Ajouter a la file d'attente devis
    INSERT INTO ready_for_quote_queue (lead_id, priority_score, documents_verified, status)
    VALUES (p_lead_id, 80, true, 'waiting')
    ON CONFLICT DO NOTHING;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- RLS
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_autonomous_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_collection_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE ready_for_quote_queue ENABLE ROW LEVEL SECURITY;

-- Policies lecture pour admins
CREATE POLICY "Admin full access pipeline_stages" ON pipeline_stages FOR ALL TO authenticated
  USING ((SELECT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())));

CREATE POLICY "Admin full access lead_journey" ON lead_journey FOR ALL TO authenticated
  USING ((SELECT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())));

CREATE POLICY "Admin full access ai_autonomous_tasks" ON ai_autonomous_tasks FOR ALL TO authenticated
  USING ((SELECT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())));

CREATE POLICY "Admin full access document_collection_status" ON document_collection_status FOR ALL TO authenticated
  USING ((SELECT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())));

CREATE POLICY "Admin full access ready_for_quote_queue" ON ready_for_quote_queue FOR ALL TO authenticated
  USING ((SELECT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())));

-- Index performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON crm_leads(current_stage_key);
CREATE INDEX IF NOT EXISTS idx_crm_leads_ready_quote ON crm_leads(ready_for_quote) WHERE ready_for_quote = true;
CREATE INDEX IF NOT EXISTS idx_crm_leads_needs_human ON crm_leads(needs_human_intervention) WHERE needs_human_intervention = true;