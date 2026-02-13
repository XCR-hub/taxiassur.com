/*
  # Tables CRM essentielles
  
  Crée les tables nécessaires pour le fonctionnement du CRM
*/

-- Table des compagnies d'assurance
CREATE TABLE IF NOT EXISTS insurance_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des devis par compagnie
CREATE TABLE IF NOT EXISTS lead_company_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  insurance_company_id UUID REFERENCES insurance_companies(id) ON DELETE CASCADE,
  
  -- Détails du devis
  quote_amount DECIMAL(10,2),
  quote_reference TEXT,
  quote_status TEXT DEFAULT 'pending' CHECK (quote_status IN ('pending', 'sent', 'validated', 'refused', 'expired')),
  quote_pdf_url TEXT,
  
  -- Validation par le prospect
  validated_by_prospect BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  refusal_reason TEXT,
  
  -- Dates
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  quote_accepted_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des documents des leads
CREATE TABLE IF NOT EXISTS crm_lead_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  
  -- Info document
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  
  -- Statut
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'refused', 'expired')),
  validated_at TIMESTAMPTZ,
  validated_by UUID,
  refusal_reason TEXT,
  
  -- Metadata
  custom_label TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Dates
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des documents prospects (uploadés par les prospects)
CREATE TABLE IF NOT EXISTS prospect_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  
  -- Info document
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  download_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  
  -- Statut
  status TEXT DEFAULT 'pending',
  validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  validated_by UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des interactions/timeline
CREATE TABLE IF NOT EXISTS crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  
  -- Type et contenu
  interaction_type TEXT NOT NULL,
  channel TEXT,
  direction TEXT,
  subject TEXT,
  content TEXT,
  
  -- Acteur
  created_by UUID,
  assigned_to UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des notifications événements
CREATE TABLE IF NOT EXISTS crm_event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  
  -- Notification
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  
  -- Contexte
  context_data JSONB DEFAULT '{}'::jsonb,
  action_url TEXT,
  
  -- Statut
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_companies_slug ON insurance_companies(slug);
CREATE INDEX IF NOT EXISTS idx_insurance_companies_active ON insurance_companies(is_active);

CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_lead ON lead_company_quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_company ON lead_company_quotes(insurance_company_id);
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_status ON lead_company_quotes(quote_status);

CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_lead ON crm_lead_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_type ON crm_lead_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_status ON crm_lead_documents(status);

CREATE INDEX IF NOT EXISTS idx_prospect_documents_lead ON prospect_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_prospect_documents_type ON prospect_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_lead ON crm_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_type ON crm_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created ON crm_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_event_notifications_lead ON crm_event_notifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_event_notifications_unread ON crm_event_notifications(is_read) WHERE is_read = false;

-- RLS
ALTER TABLE insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_company_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_event_notifications ENABLE ROW LEVEL SECURITY;

-- Policies simples (tous les authentifiés)
CREATE POLICY "Authenticated can view insurance companies"
  ON insurance_companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can manage quotes"
  ON lead_company_quotes FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage lead documents"
  ON crm_lead_documents FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view prospect documents"
  ON prospect_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can manage interactions"
  ON crm_interactions FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can manage notifications"
  ON crm_event_notifications FOR ALL TO authenticated USING (true);

-- Policy pour accès public aux compagnies actives
CREATE POLICY "Public can view active insurance companies"
  ON insurance_companies FOR SELECT TO anon 
  USING (is_active = true);

-- Policies pour prospects (via token)
CREATE POLICY "Prospects can upload documents"
  ON prospect_documents FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Prospects can view their quotes"
  ON lead_company_quotes FOR SELECT TO anon USING (true);