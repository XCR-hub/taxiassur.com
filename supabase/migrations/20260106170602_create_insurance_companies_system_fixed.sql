/*
  # Système de Gestion des Compagnies d'Assurance

  1. Tables Créées
    - `insurance_companies` - Liste des compagnies partenaires (MFA, GENERALI, +Simple, SollyAzar, Zephir)
    - `company_documents` - Documents obligatoires par compagnie
    - `lead_company_quotes` - Suivi des devis/refus par compagnie pour chaque lead

  2. Fonctionnalités
    - Gestion complète des compagnies partenaires
    - Upload de documents obligatoires par compagnie
    - Suivi devis/refus pour chaque lead et compagnie
    - Validation automatique quand toutes les compagnies sont traitées
    - Historique complet des soumissions

  3. Sécurité
    - RLS activé sur toutes les tables
    - Admins: gestion complète
    - Commerciaux: soumission devis/refus
*/

-- Enum pour le statut des devis
DO $$ BEGIN
  CREATE TYPE lead_company_quote_status AS ENUM (
    'pending',
    'quote_submitted',
    'refused',
    'validated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table des compagnies d'assurance
CREATE TABLE IF NOT EXISTS insurance_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  logo_url text,
  contact_email text,
  contact_phone text,
  website text,
  description text,
  is_active boolean DEFAULT true,
  priority_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des documents obligatoires par compagnie
CREATE TABLE IF NOT EXISTS company_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES insurance_companies(id) ON DELETE CASCADE NOT NULL,
  document_name text NOT NULL,
  document_type text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  mime_type text,
  is_mandatory boolean DEFAULT true,
  send_with_quote boolean DEFAULT true,
  send_with_contract boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table de suivi des devis/refus par compagnie
CREATE TABLE IF NOT EXISTS lead_company_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES insurance_companies(id) ON DELETE CASCADE NOT NULL,
  status lead_company_quote_status DEFAULT 'pending',
  quote_amount numeric(10,2),
  quote_file_url text,
  refusal_reason text,
  refusal_screenshot_url text,
  submitted_by uuid REFERENCES admin_users(id),
  submitted_at timestamptz,
  validated_at timestamptz,
  sent_to_client_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, company_id)
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_company_documents_company_id ON company_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_lead_id ON lead_company_quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_company_id ON lead_company_quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_status ON lead_company_quotes(status);
CREATE INDEX IF NOT EXISTS idx_insurance_companies_active ON insurance_companies(is_active, priority_order);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_insurance_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_company_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_lead_company_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_insurance_companies_updated_at ON insurance_companies;
CREATE TRIGGER trigger_insurance_companies_updated_at
  BEFORE UPDATE ON insurance_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_insurance_companies_updated_at();

DROP TRIGGER IF EXISTS trigger_company_documents_updated_at ON company_documents;
CREATE TRIGGER trigger_company_documents_updated_at
  BEFORE UPDATE ON company_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_company_documents_updated_at();

DROP TRIGGER IF EXISTS trigger_lead_company_quotes_updated_at ON lead_company_quotes;
CREATE TRIGGER trigger_lead_company_quotes_updated_at
  BEFORE UPDATE ON lead_company_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_company_quotes_updated_at();

-- RLS Policies

-- Insurance Companies
ALTER TABLE insurance_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les admins peuvent tout gérer sur insurance_companies"
  ON insurance_companies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Les commerciaux peuvent voir les compagnies actives"
  ON insurance_companies FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Company Documents
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les admins peuvent tout gérer sur company_documents"
  ON company_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Les commerciaux peuvent voir les documents"
  ON company_documents FOR SELECT
  TO authenticated
  USING (true);

-- Lead Company Quotes
ALTER TABLE lead_company_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les admins peuvent tout voir sur lead_company_quotes"
  ON lead_company_quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Les commerciaux peuvent créer des devis/refus"
  ON lead_company_quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Les commerciaux peuvent mettre à jour leurs devis"
  ON lead_company_quotes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Insertion des 5 compagnies partenaires obligatoires
INSERT INTO insurance_companies (name, code, is_active, priority_order, description) VALUES
  ('MFA - Mutuelle des Fa', 'MFA', true, 1, 'Mutuelle des Fa (2MA) - Spécialiste assurance taxi et VTC'),
  ('Generali', 'GENERALI', true, 2, 'Generali - Leader européen de l''assurance'),
  ('+Simple Assurance', 'PLUS_SIMPLE', true, 3, '+Simple - Assurance digitale simplifiée'),
  ('Solly Azar', 'SOLLY_AZAR', true, 4, 'Solly Azar - Courtier grossiste en assurance'),
  ('Zephir Assurances', 'ZEPHIR', true, 5, 'Zephir - Assurance innovante pour professionnels')
ON CONFLICT (code) DO NOTHING;

-- Fonction pour initialiser les quotes en attente pour un nouveau lead
CREATE OR REPLACE FUNCTION initialize_lead_company_quotes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lead_company_quotes (lead_id, company_id, status)
  SELECT NEW.id, ic.id, 'pending'
  FROM insurance_companies ic
  WHERE ic.is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_initialize_lead_company_quotes ON leads;
CREATE TRIGGER trigger_initialize_lead_company_quotes
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION initialize_lead_company_quotes();

-- Vue pour avoir un aperçu du statut de validation par lead
CREATE OR REPLACE VIEW lead_company_validation_status AS
SELECT
  l.id as lead_id,
  l.name,
  l.email,
  COUNT(lcq.id) as total_companies,
  COUNT(lcq.id) FILTER (WHERE lcq.status = 'validated') as validated_count,
  COUNT(lcq.id) FILTER (WHERE lcq.status = 'quote_submitted') as submitted_count,
  COUNT(lcq.id) FILTER (WHERE lcq.status = 'refused') as refused_count,
  COUNT(lcq.id) FILTER (WHERE lcq.status = 'pending') as pending_count,
  CASE
    WHEN COUNT(lcq.id) = COUNT(lcq.id) FILTER (WHERE lcq.status IN ('validated', 'refused'))
    THEN true
    ELSE false
  END as all_companies_processed
FROM leads l
LEFT JOIN lead_company_quotes lcq ON l.id = lcq.lead_id
GROUP BY l.id, l.name, l.email;
