/*
  # SYSTÈME D'AUTOMATISATION CRM ULTRA-AVANCÉ

  Objectif : Automatiser 90% des tâches répétitives du CRM

  1. Tables Automatisation
    - automation_rules : Règles d'automatisation configurables
    - automation_history : Historique de toutes les actions automatiques
    - lead_activities : Activités détectées automatiquement
    - automation_triggers : Déclencheurs personnalisés
    - scoring_rules : Règles de calcul de score

  2. Fonctionnalités IA
    - Auto-scoring en temps réel
    - Détection d'opportunités
    - Prédiction de conversion
    - Relances intelligentes
    - Enrichissement de données

  3. Sécurité
    - RLS sur toutes les tables
    - Audit trail complet
*/

-- ==============================
-- RÈGLES D'AUTOMATISATION
-- ==============================

CREATE TABLE IF NOT EXISTS crm_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  trigger_type text NOT NULL,
  trigger_conditions jsonb DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  execution_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  last_executed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==============================
-- HISTORIQUE AUTOMATISATIONS
-- ==============================

CREATE TABLE IF NOT EXISTS crm_automation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES crm_automation_rules(id),
  lead_id uuid REFERENCES crm_leads_enhanced(id),
  action_type text NOT NULL,
  action_details jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL,
  error_message text,
  score_change integer DEFAULT 0,
  stage_before text,
  stage_after text,
  executed_at timestamptz DEFAULT now(),
  execution_time_ms integer
);

-- ==============================
-- ACTIVITÉS LEAD (Détection Auto)
-- ==============================

CREATE TABLE IF NOT EXISTS crm_lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads_enhanced(id),
  activity_type text NOT NULL,
  activity_details jsonb DEFAULT '{}'::jsonb,
  score_impact integer DEFAULT 0,
  source text,
  user_agent text,
  ip_address text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ==============================
-- TRIGGERS PERSONNALISÉS
-- ==============================

CREATE TABLE IF NOT EXISTS crm_automation_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_sql text NOT NULL,
  check_interval_minutes integer DEFAULT 60,
  automation_rule_id uuid REFERENCES crm_automation_rules(id),
  is_active boolean DEFAULT true,
  last_checked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ==============================
-- SCORING RULES (Auto-calcul)
-- ==============================

CREATE TABLE IF NOT EXISTS crm_scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  condition_field text NOT NULL,
  condition_operator text NOT NULL,
  condition_value text NOT NULL,
  points_awarded integer NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Règles de scoring par défaut
INSERT INTO crm_scoring_rules (name, description, condition_field, condition_operator, condition_value, points_awarded, priority) VALUES
('Flotte importante', 'Plus de 5 véhicules', 'vehicle_count', 'greater_than', '5', 25, 10),
('Flotte moyenne', '3-5 véhicules', 'vehicle_count', 'greater_than', '2', 15, 9),
('Réponse rapide', 'Répond dans l''heure', 'response_time_minutes', 'less_than', '60', 20, 8),
('VTC', 'Activité VTC', 'activity_type', 'equals', 'vtc', 10, 7),
('Documents fournis', 'A envoyé des documents', 'documents_count', 'greater_than', '0', 15, 6),
('Multiple interactions', 'Plus de 3 interactions', 'interaction_count', 'greater_than', '3', 20, 5),
('Email ouvert', 'A ouvert notre email', 'email_opened', 'equals', 'true', 5, 4),
('Lien cliqué', 'A cliqué sur un lien', 'link_clicked', 'equals', 'true', 10, 3)
ON CONFLICT DO NOTHING;

-- ==============================
-- INDEXES
-- ==============================

CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON crm_automation_rules(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_automation_history_lead ON crm_automation_history(lead_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_history_rule ON crm_automation_history(rule_id, status);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON crm_lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON crm_lead_activities(activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scoring_rules_active ON crm_scoring_rules(is_active, priority DESC);

-- ==============================
-- ROW LEVEL SECURITY
-- ==============================

ALTER TABLE crm_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_automation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_automation_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read automation rules" ON crm_automation_rules FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Auth insert automation rules" ON crm_automation_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update automation rules" ON crm_automation_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete automation rules" ON crm_automation_rules FOR DELETE TO authenticated USING (true);

CREATE POLICY "See automation history authenticated" ON crm_automation_history FOR SELECT TO authenticated USING (lead_id IN (SELECT id FROM crm_leads_enhanced WHERE assigned_to = auth.uid()));
CREATE POLICY "Anon read automation history" ON crm_automation_history FOR SELECT TO anon USING (true);
CREATE POLICY "Insert automation history" ON crm_automation_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "See activities of own leads" ON crm_lead_activities FOR SELECT TO authenticated USING (lead_id IN (SELECT id FROM crm_leads_enhanced WHERE assigned_to = auth.uid()));
CREATE POLICY "Insert activities" ON crm_lead_activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon read lead activities" ON crm_lead_activities FOR SELECT TO anon USING (true);

CREATE POLICY "Auth read triggers" ON crm_automation_triggers FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Auth insert triggers" ON crm_automation_triggers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update triggers" ON crm_automation_triggers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete triggers" ON crm_automation_triggers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Public read scoring rules" ON crm_scoring_rules FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Anon read scoring rules" ON crm_scoring_rules FOR SELECT TO anon USING (true);
CREATE POLICY "Auth insert scoring rules" ON crm_scoring_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update scoring rules" ON crm_scoring_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ==============================
-- FUNCTION: Auto-calcul score lead
-- ==============================

CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score integer := 0;
  v_lead record;
  v_interactions_count integer;
  v_documents_count integer;
BEGIN
  SELECT * INTO v_lead FROM crm_leads_enhanced WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO v_interactions_count FROM crm_interactions WHERE lead_id = p_lead_id;
  SELECT COUNT(*) INTO v_documents_count FROM crm_documents WHERE lead_id = p_lead_id;

  v_score := v_score + LEAST(v_lead.vehicle_count * 5, 30);
  v_score := v_score + LEAST(v_interactions_count * 3, 30);
  v_score := v_score + (v_documents_count * 10);

  SELECT COALESCE(SUM(score_impact), 0) + v_score INTO v_score FROM crm_lead_activities WHERE lead_id = p_lead_id;

  v_score := LEAST(v_score, 100);

  UPDATE crm_leads_enhanced SET lead_score = v_score, conversion_probability = v_score::numeric WHERE id = p_lead_id;

  RETURN v_score;
END;
$$;

-- ==============================
-- FUNCTION: Créer suggestion IA auto
-- ==============================

CREATE OR REPLACE FUNCTION create_ai_suggestion_for_lead(
  p_lead_id uuid,
  p_suggestion_type text,
  p_suggestion_text text,
  p_reasoning text,
  p_priority_score numeric DEFAULT 50,
  p_urgency text DEFAULT 'normal'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_suggestion_id uuid;
BEGIN
  INSERT INTO crm_ai_suggestions (lead_id, suggestion_type, suggestion_text, reasoning, priority_score, urgency, status)
  VALUES (p_lead_id, p_suggestion_type, p_suggestion_text, p_reasoning, p_priority_score, p_urgency, 'pending')
  RETURNING id INTO v_suggestion_id;
  RETURN v_suggestion_id;
END;
$$;

-- ==============================
-- TRIGGER: Auto-score après interaction
-- ==============================

CREATE OR REPLACE FUNCTION trigger_recalculate_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM calculate_lead_score(NEW.lead_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recalculate_score_after_interaction ON crm_interactions;
CREATE TRIGGER recalculate_score_after_interaction AFTER INSERT ON crm_interactions FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_score();

DROP TRIGGER IF EXISTS recalculate_score_after_activity ON crm_lead_activities;
CREATE TRIGGER recalculate_score_after_activity AFTER INSERT ON crm_lead_activities FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_score();

-- ==============================
-- FUNCTION: Détection opportunités
-- ==============================

CREATE OR REPLACE FUNCTION detect_opportunities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead record;
  v_days integer;
BEGIN
  FOR v_lead IN
    SELECT * FROM crm_leads_enhanced
    WHERE lead_score >= 70 AND status = 'active'
    AND (last_contact_at IS NULL OR last_contact_at < now() - INTERVAL '3 days')
    AND stage NOT IN ('Contrat Signé', 'Perdu')
  LOOP
    v_days := COALESCE(EXTRACT(DAY FROM now() - v_lead.last_contact_at)::integer, 999);
    PERFORM create_ai_suggestion_for_lead(
      v_lead.id, 'call_now',
      'Lead chaud sans contact depuis ' || v_days || ' jours',
      'Score élevé (' || v_lead.lead_score || ') mais inactif.',
      85,
      CASE WHEN v_days > 7 THEN 'critical' WHEN v_days > 5 THEN 'high' ELSE 'normal' END
    );
  END LOOP;

  FOR v_lead IN
    SELECT * FROM crm_leads_enhanced WHERE stage = 'Négociation' AND last_contact_at < now() - INTERVAL '5 days'
  LOOP
    PERFORM create_ai_suggestion_for_lead(v_lead.id, 'send_email', 'Relancer la négociation', 'En négociation depuis plus de 5 jours.', 75, 'high');
  END LOOP;
END;
$$;