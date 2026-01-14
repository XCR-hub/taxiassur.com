/*
  # Amélioration du système de workflow d'assurance TaxiAssur

  1. Modifications de Tables Existantes
    - Ajouter colonnes manquantes à insurance_companies
    - Créer les nouvelles tables du workflow complet
    
  2. Nouvelles Tables
    - company_document_library - Bibliothèque de documents par compagnie
    - lead_quotes - Devis par compagnie pour chaque lead
    - quote_refusal_motives - Motifs de refus de devis
    - document_validation_status - Statut de validation des documents
    - lead_subscription_details - Détails RIB, dates
    - lead_contracts - Contrats uploadés et signés
    - lead_attestations - Attestations d'assurance
    
  3. Sécurité
    - Enable RLS sur toutes les tables
*/

-- 1. Améliorer la table insurance_companies existante
ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS claims_phone TEXT;
ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS assistance_phone TEXT;
ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS extranet_url TEXT;
ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false;

-- Mettre à jour les 5 compagnies obligatoires
UPDATE insurance_companies SET is_mandatory = true WHERE code IN ('GENERALI', 'MFA', 'PLUS_SIMPLE', 'SOLLY_AZAR', 'ZEPHIR');

-- Insérer les 5 compagnies si elles n'existent pas
INSERT INTO insurance_companies (code, name, priority_order, is_mandatory, is_active) VALUES
  ('GENERALI', 'Generali', 1, true, true),
  ('MFA', 'MFA (2MA)', 2, true, true),
  ('PLUS_SIMPLE', '+Simple', 3, true, true),
  ('SOLLY_AZAR', 'Solly Azar', 4, true, true),
  ('ZEPHIR', 'Zéphir', 5, true, true)
ON CONFLICT (code) DO UPDATE SET 
  is_mandatory = EXCLUDED.is_mandatory,
  priority_order = EXCLUDED.priority_order;

-- 2. Bibliothèque de documents par compagnie
CREATE TABLE IF NOT EXISTS company_document_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES insurance_companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  version TEXT,
  effective_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_doc_library_company ON company_document_library(company_id);
CREATE INDEX IF NOT EXISTS idx_company_doc_library_type ON company_document_library(document_type);

-- 3. Motifs de refus de devis
CREATE TABLE IF NOT EXISTS quote_refusal_motives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  INSERT INTO quote_refusal_motives (code, label, category, display_order) VALUES
    ('TOO_EXPENSIVE', 'Trop cher', 'price', 1),
    ('INSUFFICIENT_COVERAGE', 'Garanties insuffisantes', 'coverage', 2),
    ('BETTER_OFFER_ELSEWHERE', 'Meilleure offre ailleurs', 'price', 3),
    ('BAD_SERVICE_REPUTATION', 'Mauvaise réputation du service', 'service', 4),
    ('COMPLEX_CONDITIONS', 'Conditions trop complexes', 'coverage', 5),
    ('LONG_COMMITMENT', 'Engagement trop long', 'other', 6),
    ('CHANGE_OF_MIND', 'Changement d''avis', 'other', 7),
    ('OTHER', 'Autre raison', 'other', 8)
  ON CONFLICT (code) DO NOTHING;
END $$;

-- 4. Devis par compagnie
CREATE TABLE IF NOT EXISTS lead_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  company_id UUID REFERENCES insurance_companies(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  quote_file_url TEXT,
  quote_amount DECIMAL(10,2),
  quote_reference TEXT,
  quote_valid_until DATE,
  uploaded_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES admin_users(id),
  company_refusal_reason TEXT,
  company_refused_at TIMESTAMPTZ,
  client_refusal_motive_id UUID REFERENCES quote_refusal_motives(id),
  client_refusal_comment TEXT,
  client_refused_at TIMESTAMPTZ,
  client_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_quotes_lead ON lead_quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_quotes_company ON lead_quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_quotes_status ON lead_quotes(status);

-- 5. Validation des documents
CREATE TABLE IF NOT EXISTS document_validation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  validation_status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  rejection_comment TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES admin_users(id),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES admin_users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_validation_lead ON document_validation_status(lead_id);
CREATE INDEX IF NOT EXISTS idx_doc_validation_status ON document_validation_status(validation_status);

-- 6. Détails de souscription
CREATE TABLE IF NOT EXISTS lead_subscription_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE UNIQUE,
  accepted_quote_id UUID REFERENCES lead_quotes(id),
  iban TEXT,
  bic TEXT,
  account_holder_name TEXT,
  rib_file_url TEXT,
  rib_uploaded_at TIMESTAMPTZ,
  desired_effect_date DATE,
  debit_date DATE,
  subscription_validated_at TIMESTAMPTZ,
  subscription_validated_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_details_lead ON lead_subscription_details(lead_id);

-- 7. Contrats
CREATE TABLE IF NOT EXISTS lead_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  company_id UUID REFERENCES insurance_companies(id),
  contract_number TEXT,
  contract_file_url TEXT NOT NULL,
  contract_uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES admin_users(id),
  signature_required BOOLEAN DEFAULT true,
  signature_url TEXT,
  signed_at TIMESTAMPTZ,
  signed_file_url TEXT,
  signature_ip TEXT,
  signature_user_agent TEXT,
  sent_to_company_at TIMESTAMPTZ,
  sent_by UUID REFERENCES admin_users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_lead ON lead_contracts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON lead_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_signed ON lead_contracts(signed_at) WHERE signed_at IS NOT NULL;

-- 8. Attestations
CREATE TABLE IF NOT EXISTS lead_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES lead_contracts(id) ON DELETE CASCADE,
  attestation_type TEXT DEFAULT 'insurance_certificate',
  attestation_number TEXT,
  attestation_file_url TEXT NOT NULL,
  valid_from DATE,
  valid_until DATE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES admin_users(id),
  client_notified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attestations_lead ON lead_attestations(lead_id);
CREATE INDEX IF NOT EXISTS idx_attestations_contract ON lead_attestations(contract_id);
CREATE INDEX IF NOT EXISTS idx_attestations_valid ON lead_attestations(valid_from, valid_until);

-- Enable RLS
ALTER TABLE company_document_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_refusal_motives ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_validation_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_subscription_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_attestations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users view company docs" ON company_document_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users manage company docs" ON company_document_library FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users view refusal motives" ON quote_refusal_motives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users manage quotes" ON lead_quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage doc validation" ON document_validation_status FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage subscription" ON lead_subscription_details FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage contracts" ON lead_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage attestations" ON lead_attestations FOR ALL TO authenticated USING (true) WITH CHECK (true);