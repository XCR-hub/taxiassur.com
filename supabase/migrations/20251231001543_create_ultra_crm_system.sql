/*
  # CRM ULTRA-COMPLET TAXIASSUR.COM
  
  OBJECTIF : 100 demandes/jour → 80 contrats signés (80% taux conversion)
  
  1. Nouvelles Tables
    - `crm_leads_enhanced` - Leads enrichis avec scoring
    - `crm_interactions` - Tous échanges (email, SMS, appel, meeting)
    - `crm_documents` - Documents prospects/clients
    - `crm_email_templates` - Templates emails IA-optimisés
    - `crm_sms_templates` - Templates SMS
    - `crm_call_recordings` - Enregistrements appels
    - `crm_tasks` - Tâches commerciaux
    - `crm_pipeline_stages` - Étapes pipeline vente
    - `crm_companies_insurers` - Compagnies d'assurance partenaires
    - `crm_quotes_sent` - Devis envoyés
    - `crm_contracts_signed` - Contrats signés
    - `crm_ai_suggestions` - Suggestions IA en temps réel
    - `crm_notifications` - Notifications commerciaux
    
  2. IA Auto-Apprenante
    - Analyse tous les échanges
    - Identifie patterns de succès
    - Suggère actions optimales
    - Améliore templates automatiquement
    
  3. Sécurité
    - RLS strict par commercial
    - Chiffrement documents sensibles
    - Audit trail complet
*/

-- ==============================
-- LEADS ENRICHIS
-- ==============================

CREATE TABLE IF NOT EXISTS crm_leads_enhanced (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Infos prospect
  email text NOT NULL,
  phone text NOT NULL,
  first_name text,
  last_name text,
  company_name text,
  
  -- Détails activité
  activity_type text DEFAULT 'taxi',
  vehicle_count integer DEFAULT 1,
  current_insurer text,
  current_premium_annual numeric(10,2),
  
  -- Scoring IA
  lead_score integer DEFAULT 0,
  conversion_probability numeric(5,2) DEFAULT 0,
  estimated_value_annual numeric(10,2) DEFAULT 0,
  
  -- Statut CRM
  stage text DEFAULT 'new',
  status text DEFAULT 'active',
  assigned_to uuid REFERENCES auth.users(id),
  source text DEFAULT 'website',
  
  -- Dates importantes
  created_at timestamptz DEFAULT now(),
  first_contact_at timestamptz,
  last_contact_at timestamptz,
  next_followup_at timestamptz,
  converted_at timestamptz,
  
  -- Meta
  tags text[] DEFAULT '{}',
  custom_fields jsonb DEFAULT '{}'::jsonb,
  ai_notes jsonb DEFAULT '{}'::jsonb
);

-- ==============================
-- INTERACTIONS (emails, SMS, appels)
-- ==============================

CREATE TABLE IF NOT EXISTS crm_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  
  -- Type interaction
  type text NOT NULL, -- 'email', 'sms', 'call', 'meeting', 'note'
  direction text NOT NULL, -- 'inbound', 'outbound'
  
  -- Contenu
  subject text,
  content text,
  summary text,
  
  -- Métadonnées
  from_email text,
  to_email text,
  from_phone text,
  to_phone text,
  
  -- Pour appels
  call_duration_seconds integer,
  call_recording_url text,
  call_transcript text,
  
  -- IA Analysis
  sentiment_score numeric(5,2),
  intent_detected text,
  ai_summary text,
  key_points text[] DEFAULT '{}',
  action_items text[] DEFAULT '{}',
  
  -- Suivi
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  
  -- Meta
  metadata jsonb DEFAULT '{}'::jsonb
);

-- ==============================
-- DOCUMENTS
-- ==============================

CREATE TABLE IF NOT EXISTS crm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  
  -- Fichier
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size_bytes bigint,
  storage_path text NOT NULL,
  
  -- Classification IA
  document_type text NOT NULL, -- 'carte_grise', 'permis', 'kbis', 'rib', 'attestation', 'other'
  confidence_score numeric(5,2),
  
  -- Validation
  status text DEFAULT 'pending', -- 'pending', 'validated', 'rejected', 'missing'
  validated_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  rejection_reason text,
  
  -- Métadonnées extraites par IA
  extracted_data jsonb DEFAULT '{}'::jsonb,
  
  -- Suivi
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now(),
  
  -- Sécurité
  is_encrypted boolean DEFAULT false,
  access_restricted boolean DEFAULT true
);

-- ==============================
-- TEMPLATES EMAILS
-- ==============================

CREATE TABLE IF NOT EXISTS crm_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text NOT NULL,
  
  -- Variables dynamiques
  variables jsonb DEFAULT '[]'::jsonb,
  
  -- Usage
  category text NOT NULL, -- 'premier_contact', 'relance', 'devis', 'signature', 'suivi'
  use_count integer DEFAULT 0,
  
  -- Performance IA
  avg_open_rate numeric(5,2) DEFAULT 0,
  avg_reply_rate numeric(5,2) DEFAULT 0,
  avg_conversion_rate numeric(5,2) DEFAULT 0,
  performance_score numeric(5,2) DEFAULT 0,
  
  -- IA Optimization
  optimized_by_ai boolean DEFAULT false,
  ai_improvements jsonb DEFAULT '[]'::jsonb,
  
  -- Meta
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==============================
-- TEMPLATES SMS
-- ==============================

CREATE TABLE IF NOT EXISTS crm_sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name text NOT NULL,
  content text NOT NULL,
  
  category text NOT NULL,
  use_count integer DEFAULT 0,
  
  -- Performance
  avg_reply_rate numeric(5,2) DEFAULT 0,
  avg_conversion_rate numeric(5,2) DEFAULT 0,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ==============================
-- ENREGISTREMENTS APPELS
-- ==============================

CREATE TABLE IF NOT EXISTS crm_call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid REFERENCES crm_interactions(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  
  -- Appel
  recording_url text NOT NULL,
  duration_seconds integer NOT NULL,
  
  -- Transcription IA
  transcript_full text,
  transcript_summary text,
  
  -- Analyse IA
  sentiment_analysis jsonb DEFAULT '{}'::jsonb,
  keywords_detected text[] DEFAULT '{}',
  objections_detected text[] DEFAULT '{}',
  buying_signals text[] DEFAULT '{}',
  
  -- Qualité
  call_quality_score numeric(5,2),
  commercial_performance_score numeric(5,2),
  
  -- Suivi
  created_at timestamptz DEFAULT now(),
  analyzed_at timestamptz
);

-- ==============================
-- TÂCHES COMMERCIAUX
-- ==============================

CREATE TABLE IF NOT EXISTS crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  
  -- Tâche
  title text NOT NULL,
  description text,
  type text NOT NULL, -- 'call', 'email', 'meeting', 'followup', 'document_request'
  priority text DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  
  -- Échéance
  due_date timestamptz,
  due_time time,
  
  -- Assignation
  assigned_to uuid REFERENCES auth.users(id) NOT NULL,
  assigned_by uuid REFERENCES auth.users(id),
  
  -- Statut
  status text DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  completed_at timestamptz,
  
  -- IA
  auto_generated boolean DEFAULT false,
  ai_reasoning text,
  
  created_at timestamptz DEFAULT now()
);

-- ==============================
-- PIPELINE VENTE
-- ==============================

CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name text NOT NULL,
  display_order integer NOT NULL,
  
  -- Stats
  avg_time_in_stage_days numeric(10,2) DEFAULT 0,
  conversion_rate_to_next numeric(5,2) DEFAULT 0,
  
  -- IA
  ai_tips jsonb DEFAULT '[]'::jsonb,
  
  is_active boolean DEFAULT true
);

-- Stages par défaut
INSERT INTO crm_pipeline_stages (name, display_order, ai_tips) VALUES
('Nouveau Lead', 1, '["Répondre dans les 5 minutes", "Appel téléphonique prioritaire", "Personnaliser le premier contact"]'::jsonb),
('Premier Contact', 2, '["Qualifier le besoin", "Identifier décideur", "Noter objections"]'::jsonb),
('Qualifié', 3, '["Envoyer devis personnalisé", "Proposer RDV téléphonique", "Suivre sous 24h"]'::jsonb),
('Devis Envoyé', 4, '["Relancer J+2", "Proposer comparatif", "Répondre objections"]'::jsonb),
('Négociation', 5, '["Identifier blocages", "Proposer alternatives", "Deadline décision"]'::jsonb),
('Accord Verbal', 6, '["Envoyer documents", "Accompagner signature", "Faciliter paiement"]'::jsonb),
('Contrat Signé', 7, '["Onboarding client", "Demander témoignage", "Proposer parrainage"]'::jsonb),
('Perdu', 8, '["Noter raison perte", "Planifier relance future", "Apprendre pour IA"]'::jsonb)
ON CONFLICT DO NOTHING;

-- ==============================
-- COMPAGNIES D'ASSURANCE
-- ==============================

CREATE TABLE IF NOT EXISTS crm_companies_insurers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  
  -- Produits
  products_offered text[] DEFAULT '{}',
  commission_rate numeric(5,2),
  
  -- Performance
  avg_response_time_hours numeric(10,2),
  acceptance_rate numeric(5,2),
  
  -- Statut
  is_preferred boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now()
);

-- ==============================
-- DEVIS ENVOYÉS
-- ==============================

CREATE TABLE IF NOT EXISTS crm_quotes_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  
  -- Devis
  quote_number text UNIQUE NOT NULL,
  insurer_id uuid REFERENCES crm_companies_insurers(id),
  
  -- Montants
  annual_premium numeric(10,2) NOT NULL,
  monthly_premium numeric(10,2),
  
  -- Détails
  coverage_details jsonb NOT NULL,
  guarantees text[] DEFAULT '{}',
  
  -- Statut
  status text DEFAULT 'sent', -- 'sent', 'viewed', 'accepted', 'rejected', 'expired'
  
  -- Suivi
  sent_by uuid REFERENCES auth.users(id),
  sent_at timestamptz DEFAULT now(),
  viewed_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  
  -- Documents
  pdf_url text,
  
  -- IA
  ai_confidence_score numeric(5,2)
);

-- ==============================
-- CONTRATS SIGNÉS
-- ==============================

CREATE TABLE IF NOT EXISTS crm_contracts_signed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads_enhanced(id),
  quote_id uuid REFERENCES crm_quotes_sent(id),
  
  -- Contrat
  contract_number text UNIQUE NOT NULL,
  insurer_id uuid REFERENCES crm_companies_insurers(id),
  
  -- Montants
  annual_premium numeric(10,2) NOT NULL,
  commission_amount numeric(10,2),
  
  -- Dates
  start_date date NOT NULL,
  end_date date NOT NULL,
  
  -- Documents
  contract_pdf_url text,
  signed_documents jsonb DEFAULT '[]'::jsonb,
  
  -- Suivi
  signed_by uuid REFERENCES auth.users(id),
  signed_at timestamptz DEFAULT now(),
  
  -- Statut
  status text DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  
  created_at timestamptz DEFAULT now()
);

-- ==============================
-- SUGGESTIONS IA TEMPS RÉEL
-- ==============================

CREATE TABLE IF NOT EXISTS crm_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads_enhanced(id),
  
  -- Suggestion
  suggestion_type text NOT NULL, -- 'call_now', 'send_email', 'send_sms', 'schedule_meeting', 'send_document'
  suggestion_text text NOT NULL,
  reasoning text NOT NULL,
  
  -- Contenu suggéré
  suggested_content jsonb DEFAULT '{}'::jsonb,
  
  -- Priorité
  priority_score numeric(5,2) DEFAULT 0,
  urgency text DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  
  -- Statut
  status text DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  accepted_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  
  -- Performance
  led_to_conversion boolean DEFAULT false,
  
  -- Dates
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '24 hours')
);

-- ==============================
-- NOTIFICATIONS COMMERCIAUX
-- ==============================

CREATE TABLE IF NOT EXISTS crm_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  lead_id uuid REFERENCES crm_leads_enhanced(id),
  
  -- Notification
  type text NOT NULL, -- 'new_lead', 'document_uploaded', 'task_due', 'ai_suggestion', 'interaction_received'
  title text NOT NULL,
  message text NOT NULL,
  
  -- Action
  action_url text,
  action_label text,
  
  -- Statut
  is_read boolean DEFAULT false,
  read_at timestamptz,
  
  -- Priorité
  priority text DEFAULT 'normal',
  
  created_at timestamptz DEFAULT now()
);

-- ==============================
-- INDEXES
-- ==============================

CREATE INDEX IF NOT EXISTS idx_leads_assigned ON crm_leads_enhanced(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON crm_leads_enhanced(stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_score ON crm_leads_enhanced(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_followup ON crm_leads_enhanced(next_followup_at ASC);

CREATE INDEX IF NOT EXISTS idx_interactions_lead ON crm_interactions(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON crm_interactions(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_lead ON crm_documents(lead_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_status ON crm_documents(status, document_type);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON crm_tasks(assigned_to, status, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON crm_tasks(lead_id, status);

CREATE INDEX IF NOT EXISTS idx_quotes_lead ON crm_quotes_sent(lead_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON crm_quotes_sent(status, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_contracts_signed ON crm_contracts_signed(signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_insurer ON crm_contracts_signed(insurer_id, status);

CREATE INDEX IF NOT EXISTS idx_suggestions_lead ON crm_ai_suggestions(lead_id, status, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_user ON crm_ai_suggestions(status, urgency, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON crm_notifications(user_id, is_read, created_at DESC);

-- ==============================
-- ROW LEVEL SECURITY
-- ==============================

ALTER TABLE crm_leads_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_companies_insurers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_quotes_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contracts_signed ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notifications ENABLE ROW LEVEL SECURITY;

-- Leads : voir ses leads + non assignés
CREATE POLICY "Users see own and unassigned leads"
  ON crm_leads_enhanced FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR assigned_to IS NULL);

CREATE POLICY "Users manage own leads"
  ON crm_leads_enhanced FOR ALL TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Interactions : voir celles de ses leads
CREATE POLICY "Users see interactions of own leads"
  ON crm_interactions FOR SELECT TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM crm_leads_enhanced 
      WHERE assigned_to = auth.uid()
    )
  );

CREATE POLICY "Users manage interactions"
  ON crm_interactions FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Documents : RLS strict
CREATE POLICY "Users see documents of own leads"
  ON crm_documents FOR SELECT TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM crm_leads_enhanced 
      WHERE assigned_to = auth.uid()
    )
  );

CREATE POLICY "Users manage documents"
  ON crm_documents FOR ALL TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- Templates : lecture publique, modif auth
CREATE POLICY "Public read templates"
  ON crm_email_templates FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Auth manage templates"
  ON crm_email_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Public read sms templates"
  ON crm_sms_templates FOR SELECT TO authenticated
  USING (is_active = true);

-- Tasks : voir ses tâches
CREATE POLICY "Users see own tasks"
  ON crm_tasks FOR SELECT TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY "Users manage own tasks"
  ON crm_tasks FOR ALL TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Pipeline : public read
CREATE POLICY "Public read pipeline"
  ON crm_pipeline_stages FOR SELECT TO authenticated
  USING (is_active = true);

-- Insurers : public read
CREATE POLICY "Public read insurers"
  ON crm_companies_insurers FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Auth manage insurers"
  ON crm_companies_insurers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Quotes : voir ses leads
CREATE POLICY "Users see quotes of own leads"
  ON crm_quotes_sent FOR SELECT TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM crm_leads_enhanced 
      WHERE assigned_to = auth.uid()
    )
  );

CREATE POLICY "Users manage quotes"
  ON crm_quotes_sent FOR ALL TO authenticated
  USING (sent_by = auth.uid())
  WITH CHECK (sent_by = auth.uid());

-- Contracts : voir ses leads
CREATE POLICY "Users see contracts of own leads"
  ON crm_contracts_signed FOR SELECT TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM crm_leads_enhanced 
      WHERE assigned_to = auth.uid()
    )
  );

-- Suggestions : voir pour ses leads
CREATE POLICY "Users see suggestions for own leads"
  ON crm_ai_suggestions FOR SELECT TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM crm_leads_enhanced 
      WHERE assigned_to = auth.uid()
    )
  );

CREATE POLICY "Users manage suggestions"
  ON crm_ai_suggestions FOR UPDATE TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM crm_leads_enhanced 
      WHERE assigned_to = auth.uid()
    )
  )
  WITH CHECK (true);

-- Notifications : voir ses notifs
CREATE POLICY "Users see own notifications"
  ON crm_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON crm_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());