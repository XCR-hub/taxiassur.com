/*
  # Système de Workflow Commercial Étape par Étape

  1. Nouvelles Tables
    - `crm_workflow_steps` : Configuration des étapes du workflow
    - `crm_workflow_step_actions` : Actions effectuées pour chaque étape
    - `crm_call_logs` : Journal des appels téléphoniques avec notes
    - `crm_document_validation_actions` : Actions de validation/rejet de documents avec motifs

  2. Logique
    - Chaque lead progresse étape par étape
    - Une étape doit être complétée avec une action réelle avant de passer à la suivante
    - Les notes d'appel sont consultables dans toutes les étapes suivantes
    - Les documents peuvent être validés/rejetés avec des motifs qui génèrent des emails automatiques

  3. Sécurité
    - RLS activé sur toutes les tables
    - Accès authentifié uniquement
*/

-- Configuration des étapes du workflow
CREATE TABLE IF NOT EXISTS crm_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number integer NOT NULL,
  step_key text UNIQUE NOT NULL,
  step_title text NOT NULL,
  step_description text,
  required_action_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Actions effectuées pour valider une étape
CREATE TABLE IF NOT EXISTS crm_workflow_step_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  action_type text NOT NULL, -- 'email', 'sms', 'call', 'validation', 'manual'
  action_data jsonb DEFAULT '{}'::jsonb,
  completed_at timestamptz DEFAULT now(),
  completed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Journal des appels téléphoniques
CREATE TABLE IF NOT EXISTS crm_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  call_status text NOT NULL, -- 'answered', 'no_answer', 'voicemail', 'busy'
  duration_minutes integer,
  call_notes text NOT NULL,
  call_result text, -- 'qualified', 'not_interested', 'callback', 'wrong_number'
  next_action text,
  next_action_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Actions de validation de documents avec motifs
CREATE TABLE IF NOT EXISTS crm_document_validation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES crm_lead_documents(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'validated', 'rejected', 'category_changed'
  rejection_reason text,
  rejection_details text,
  send_email_notification boolean DEFAULT false,
  old_category text,
  new_category text,
  validated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_step_actions_lead ON crm_workflow_step_actions(lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_actions_step ON crm_workflow_step_actions(step_key);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON crm_call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON crm_call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_validation_actions_doc ON crm_document_validation_actions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_validation_actions_lead ON crm_document_validation_actions(lead_id);

-- Enable RLS
ALTER TABLE crm_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_workflow_step_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_document_validation_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view workflow steps"
  ON crm_workflow_steps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage step actions"
  ON crm_workflow_step_actions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage call logs"
  ON crm_call_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage document validations"
  ON crm_document_validation_actions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default workflow steps
INSERT INTO crm_workflow_steps (step_number, step_key, step_title, step_description, required_action_types) VALUES
(1, 'need_qualified', 'Besoin qualifié et compris', 'Contacter le prospect pour comprendre et qualifier son besoin précis', ARRAY['call', 'email', 'manual']),
(2, 'documents_collected', 'Documents collectés et validés', 'Demander et valider tous les documents nécessaires', ARRAY['email', 'validation']),
(3, 'quote_sent', 'Devis envoyé', 'Générer et envoyer le devis personnalisé', ARRAY['email', 'manual']),
(4, 'objections_handled', 'Objections traitées', 'Répondre aux questions et lever les objections', ARRAY['call', 'email', 'manual']),
(5, 'closing', 'Signature et paiement', 'Finaliser la signature du contrat et le paiement', ARRAY['manual'])
ON CONFLICT (step_key) DO NOTHING;

-- Function to get current workflow step for a lead
CREATE OR REPLACE FUNCTION get_lead_current_workflow_step(p_lead_id uuid)
RETURNS TABLE (
  step_number integer,
  step_key text,
  step_title text,
  step_description text,
  is_completed boolean,
  last_action_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH completed_steps AS (
    SELECT DISTINCT step_key, MAX(completed_at) as last_action
    FROM crm_workflow_step_actions
    WHERE lead_id = p_lead_id
    GROUP BY step_key
  )
  SELECT 
    ws.step_number,
    ws.step_key,
    ws.step_title,
    ws.step_description,
    cs.step_key IS NOT NULL as is_completed,
    cs.last_action
  FROM crm_workflow_steps ws
  LEFT JOIN completed_steps cs ON cs.step_key = ws.step_key
  WHERE ws.is_active = true
  ORDER BY ws.step_number;
END;
$$;

-- Drop and recreate get_lead_call_history function
DROP FUNCTION IF EXISTS get_lead_call_history(uuid);

CREATE FUNCTION get_lead_call_history(p_lead_id uuid)
RETURNS TABLE (
  call_date timestamptz,
  call_status text,
  duration_minutes integer,
  call_notes text,
  call_result text,
  next_action text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.created_at,
    cl.call_status,
    cl.duration_minutes,
    cl.call_notes,
    cl.call_result,
    cl.next_action
  FROM crm_call_logs cl
  WHERE cl.lead_id = p_lead_id
  ORDER BY cl.created_at DESC;
END;
$$;
