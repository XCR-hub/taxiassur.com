/*
  # Système Complet de Gestion Email et Pipeline CRM
  
  Ce système gère tout le cycle de vie d'un prospect/client :
  
  1. **Tables Documents** - Gestion des pièces obligatoires
  2. **Tables Pipeline** - Étapes du parcours client
  3. **Tables Communications** - Historique emails/SMS/WhatsApp
  4. **Tables Relances** - Système de relances automatiques
  5. **Tables Signature Électronique** - Gestion des signatures
  6. **Tables Paiements** - Suivi des paiements
  
  PIÈCES OBLIGATOIRES:
  - CNI (Carte Nationale d'Identité)
  - Kbis
  - Carte professionnelle
  - Carte grise
  - Relevé de sinistres
  - RIB
  - Autorisation de stationnement
  
  INFORMATIONS OBLIGATOIRES:
  - Nom, Prénom
  - Téléphone, Email
  - Adresse complète
*/

-- ==========================================
-- 1. DOCUMENTS ET PIÈCES JUSTIFICATIVES
-- ==========================================

CREATE TABLE IF NOT EXISTS lead_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_category text NOT NULL DEFAULT 'obligatoire',
  file_url text,
  file_name text,
  file_size integer,
  mime_type text,
  status text NOT NULL DEFAULT 'missing',
  upload_date timestamptz,
  validated_by uuid,
  validated_at timestamptz,
  rejection_reason text,
  expiry_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_documents_lead ON lead_documents(lead_id, document_type);
CREATE INDEX IF NOT EXISTS idx_lead_documents_status ON lead_documents(status, created_at DESC);

-- ==========================================
-- 2. PIPELINE ET ÉTAPES
-- ==========================================

CREATE TABLE IF NOT EXISTS lead_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name text NOT NULL UNIQUE,
  stage_order integer NOT NULL,
  stage_category text NOT NULL,
  description text,
  required_documents text[] DEFAULT ARRAY[]::text[],
  required_info text[] DEFAULT ARRAY[]::text[],
  auto_progress boolean DEFAULT false,
  notification_template text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_pipeline_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES lead_pipeline_stages(id),
  stage_name text NOT NULL,
  entered_at timestamptz DEFAULT now(),
  exited_at timestamptz,
  duration_seconds integer,
  auto_progressed boolean DEFAULT false,
  notes text,
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_pipeline_history_lead ON lead_pipeline_history(lead_id, entered_at DESC);

-- ==========================================
-- 3. COMMUNICATIONS (EMAIL/SMS/WHATSAPP)
-- ==========================================

CREATE TABLE IF NOT EXISTS lead_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  communication_type text NOT NULL,
  direction text NOT NULL,
  channel text NOT NULL,
  subject text,
  content text NOT NULL,
  from_address text,
  to_address text NOT NULL,
  cc_addresses text[] DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  replied_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  parent_communication_id uuid REFERENCES lead_communications(id),
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communications_lead ON lead_communications(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_status ON lead_communications(status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_channel ON lead_communications(channel, direction);

-- ==========================================
-- 4. SYSTÈME DE RELANCES
-- ==========================================

CREATE TABLE IF NOT EXISTS lead_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  reminder_reason text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  max_attempts integer DEFAULT 3,
  current_attempt integer DEFAULT 0,
  last_attempt_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_lead ON lead_reminders(lead_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON lead_reminders(status, scheduled_for);

-- ==========================================
-- 5. DEVIS
-- ==========================================

CREATE TABLE IF NOT EXISTS lead_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  quote_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  amount numeric(10,2) NOT NULL,
  validity_date date NOT NULL,
  quote_data jsonb NOT NULL,
  created_by uuid,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  signature_url text,
  signed_at timestamptz,
  pdf_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_lead ON lead_quotes(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON lead_quotes(status);

-- ==========================================
-- 6. PAIEMENTS
-- ==========================================

CREATE TABLE IF NOT EXISTS lead_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES lead_quotes(id),
  payment_type text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_link text,
  payment_link_expires_at timestamptz,
  transaction_id text,
  paid_at timestamptz,
  payment_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_lead ON lead_payments(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON lead_payments(status);

-- ==========================================
-- 7. CONTRATS
-- ==========================================

CREATE TABLE IF NOT EXISTS lead_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES lead_quotes(id),
  payment_id uuid REFERENCES lead_payments(id),
  contract_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  start_date date NOT NULL,
  end_date date,
  contract_data jsonb NOT NULL,
  pdf_url text,
  signature_url text,
  signed_at timestamptz,
  activated_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_lead ON lead_contracts(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON lead_contracts(status);

-- ==========================================
-- 8. CAMPAGNES CROSS-SELLING
-- ==========================================

CREATE TABLE IF NOT EXISTS cross_sell_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name text NOT NULL,
  campaign_type text NOT NULL,
  target_audience text NOT NULL,
  product_offered text NOT NULL,
  frequency_days integer DEFAULT 15,
  is_active boolean DEFAULT true,
  email_template text NOT NULL,
  sms_template text,
  whatsapp_template text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cross_sell_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES cross_sell_campaigns(id),
  lead_id uuid NOT NULL REFERENCES crm_leads_enhanced(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL,
  channel text NOT NULL,
  opened_at timestamptz,
  clicked_at timestamptz,
  converted_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cross_sell_history ON cross_sell_history(lead_id, sent_at DESC);

-- ==========================================
-- INSERTION DES ÉTAPES DU PIPELINE
-- ==========================================

INSERT INTO lead_pipeline_stages (stage_name, stage_order, stage_category, description, required_documents, required_info, auto_progress) VALUES
('nouveau_lead', 1, 'acquisition', 'Lead vient d''arriver', ARRAY[]::text[], ARRAY['email'], false),
('informations_collecte', 2, 'qualification', 'Collection des informations de base', ARRAY[]::text[], ARRAY['nom', 'prenom', 'telephone', 'email', 'adresse'], false),
('documents_attente', 3, 'qualification', 'En attente des documents obligatoires', ARRAY['cni', 'kbis', 'carte_pro', 'carte_grise', 'releve_sinistre', 'rib', 'autorisation_stationnement'], ARRAY['nom', 'prenom', 'telephone', 'email', 'adresse'], false),
('documents_complets', 4, 'qualification', 'Tous les documents sont reçus', ARRAY['cni', 'kbis', 'carte_pro', 'carte_grise', 'releve_sinistre', 'rib', 'autorisation_stationnement'], ARRAY['nom', 'prenom', 'telephone', 'email', 'adresse'], true),
('verification_eligibilite', 5, 'qualification', 'Vérification de l''éligibilité', ARRAY[]::text[], ARRAY[]::text[], false),
('devis_preparation', 6, 'devis', 'Préparation du devis', ARRAY[]::text[], ARRAY[]::text[], false),
('devis_envoye', 7, 'devis', 'Devis envoyé au prospect', ARRAY[]::text[], ARRAY[]::text[], false),
('devis_accepte', 8, 'devis', 'Devis accepté par le prospect', ARRAY[]::text[], ARRAY[]::text[], true),
('paiement_attente', 9, 'paiement', 'En attente du paiement', ARRAY[]::text[], ARRAY[]::text[], false),
('paiement_recu', 10, 'paiement', 'Paiement reçu', ARRAY[]::text[], ARRAY[]::text[], true),
('contrat_preparation', 11, 'contrat', 'Préparation du contrat', ARRAY[]::text[], ARRAY[]::text[], false),
('contrat_signature', 12, 'contrat', 'Contrat en signature électronique', ARRAY[]::text[], ARRAY[]::text[], false),
('contrat_signe', 13, 'contrat', 'Contrat signé', ARRAY[]::text[], ARRAY[]::text[], true),
('client_actif', 14, 'client', 'Client actif', ARRAY[]::text[], ARRAY[]::text[], false)
ON CONFLICT (stage_name) DO NOTHING;

-- ==========================================
-- INSERTION DES CAMPAGNES CROSS-SELLING
-- ==========================================

INSERT INTO cross_sell_campaigns (campaign_name, campaign_type, target_audience, product_offered, frequency_days, email_template) VALUES
('RC Professionnelle', 'cross_sell', 'clients_actifs', 'rc_professionnelle', 15, 'template_rc_pro'),
('Mutuelle Santé Madelin', 'cross_sell', 'clients_actifs', 'mutuelle_sante', 15, 'template_mutuelle'),
('Prévoyance Madelin', 'cross_sell', 'clients_actifs', 'prevoyance', 15, 'template_prevoyance'),
('Retraite Madelin', 'cross_sell', 'clients_actifs', 'retraite', 15, 'template_retraite'),
('Assurance Habitation', 'cross_sell', 'clients_actifs', 'mrh', 15, 'template_mrh'),
('Assurance Emprunteur', 'cross_sell', 'clients_actifs', 'assurance_emprunteur', 15, 'template_emprunteur'),
('Assurance Scolaire', 'cross_sell', 'clients_actifs', 'assurance_scolaire', 15, 'template_scolaire'),
('Protection Juridique', 'cross_sell', 'clients_actifs', 'protection_juridique', 15, 'template_juridique'),
('GAV', 'cross_sell', 'clients_actifs', 'gav', 15, 'template_gav')
ON CONFLICT DO NOTHING;

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE lead_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_pipeline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_sell_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_sell_history ENABLE ROW LEVEL SECURITY;

-- Policies pour accès backoffice
CREATE POLICY "Backoffice full access lead_documents"
  ON lead_documents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Backoffice full access lead_pipeline_stages"
  ON lead_pipeline_stages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Backoffice full access lead_pipeline_history"
  ON lead_pipeline_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Backoffice full access lead_communications"
  ON lead_communications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Backoffice full access lead_reminders"
  ON lead_reminders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Backoffice full access lead_quotes"
  ON lead_quotes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Backoffice full access lead_payments"
  ON lead_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Backoffice full access lead_contracts"
  ON lead_contracts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Backoffice full access cross_sell_campaigns"
  ON cross_sell_campaigns FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Backoffice full access cross_sell_history"
  ON cross_sell_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- FONCTIONS UTILITAIRES
-- ==========================================

-- Fonction pour vérifier si toutes les pièces sont présentes
CREATE OR REPLACE FUNCTION check_lead_documents_complete(lead_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  required_docs text[] := ARRAY['cni', 'kbis', 'carte_pro', 'carte_grise', 'releve_sinistre', 'rib', 'autorisation_stationnement'];
  doc text;
  missing_docs text[] := ARRAY[]::text[];
  doc_count integer;
BEGIN
  FOREACH doc IN ARRAY required_docs
  LOOP
    SELECT COUNT(*) INTO doc_count
    FROM lead_documents
    WHERE lead_id = lead_id_param
    AND document_type = doc
    AND status IN ('uploaded', 'validated');
    
    IF doc_count = 0 THEN
      missing_docs := array_append(missing_docs, doc);
    END IF;
  END LOOP;
  
  SELECT jsonb_build_object(
    'all_documents_present', array_length(missing_docs, 1) IS NULL OR array_length(missing_docs, 1) = 0,
    'missing_documents', missing_docs,
    'total_required', array_length(required_docs, 1),
    'total_received', array_length(required_docs, 1) - COALESCE(array_length(missing_docs, 1), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Fonction pour vérifier si toutes les informations sont présentes
CREATE OR REPLACE FUNCTION check_lead_info_complete(lead_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  lead_data record;
  missing_info text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO lead_data
  FROM crm_leads_enhanced
  WHERE id = lead_id_param;
  
  IF lead_data.name IS NULL OR lead_data.name = '' THEN
    missing_info := array_append(missing_info, 'nom');
  END IF;
  
  IF lead_data.email IS NULL OR lead_data.email = '' THEN
    missing_info := array_append(missing_info, 'email');
  END IF;
  
  IF lead_data.phone IS NULL OR lead_data.phone = '' THEN
    missing_info := array_append(missing_info, 'telephone');
  END IF;
  
  IF lead_data.metadata->>'prenom' IS NULL OR lead_data.metadata->>'prenom' = '' THEN
    missing_info := array_append(missing_info, 'prenom');
  END IF;
  
  IF lead_data.metadata->>'adresse' IS NULL OR lead_data.metadata->>'adresse' = '' THEN
    missing_info := array_append(missing_info, 'adresse');
  END IF;
  
  SELECT jsonb_build_object(
    'all_info_present', array_length(missing_info, 1) IS NULL OR array_length(missing_info, 1) = 0,
    'missing_info', missing_info,
    'lead_name', lead_data.name,
    'lead_email', lead_data.email
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Fonction pour obtenir le statut complet d'un lead
CREATE OR REPLACE FUNCTION get_lead_complete_status(lead_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  current_stage record;
  docs_status jsonb;
  info_status jsonb;
BEGIN
  SELECT * INTO current_stage
  FROM lead_pipeline_history lph
  JOIN lead_pipeline_stages lps ON lph.stage_id = lps.id
  WHERE lph.lead_id = lead_id_param
  AND lph.exited_at IS NULL
  ORDER BY lph.entered_at DESC
  LIMIT 1;
  
  SELECT check_lead_documents_complete(lead_id_param) INTO docs_status;
  SELECT check_lead_info_complete(lead_id_param) INTO info_status;
  
  SELECT jsonb_build_object(
    'current_stage', current_stage.stage_name,
    'stage_category', current_stage.stage_category,
    'documents_status', docs_status,
    'info_status', info_status,
    'ready_for_quote', (docs_status->>'all_documents_present')::boolean AND (info_status->>'all_info_present')::boolean
  ) INTO result;
  
  RETURN result;
END;
$$;
