/*
  # Création de la table CRM Leads (essentielle)
  
  Table principale pour stocker tous les leads/prospects
*/

-- ENUMS
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'nouveau_lead',
    'contact_tente',
    'contact_confirme',
    'documents_requis',
    'documents_partiels',
    'pret_pour_devis',
    'devis_envoye',
    'signature_en_attente',
    'signe',
    'paiement_rib_en_attente',
    'paiement_comptant_requis',
    'client_actif',
    'perdu',
    'archive'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Table principale des leads
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identité
  first_name TEXT,
  last_name TEXT,
  prenom TEXT,
  nom TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  telephone TEXT,
  
  -- Adresse
  address TEXT,
  adresse TEXT,
  postal_code TEXT,
  code_postal TEXT,
  city TEXT,
  ville TEXT,
  
  -- Business
  company_name TEXT,
  siret TEXT,
  immatriculation TEXT,
  
  -- Statut
  status TEXT DEFAULT 'nouveau_lead',
  lead_score INTEGER DEFAULT 0,
  temperature TEXT DEFAULT 'COLD',
  
  -- Pipeline
  pipeline_stage TEXT,
  
  -- Source
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Assignment
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  
  -- Conversion
  converted_to_client BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  
  -- Token d'accès prospect
  access_token TEXT UNIQUE,
  
  -- Numéro de contrat
  contract_number TEXT,
  
  -- Consentement
  consent_marketing BOOLEAN DEFAULT false,
  consent_sms BOOLEAN DEFAULT false,
  consent_whatsapp BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON crm_leads(email);
CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON crm_leads(phone);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created ON crm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_access_token ON crm_leads(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_pipeline_stage ON crm_leads(pipeline_stage) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

-- Politique SELECT pour authentifiés
CREATE POLICY "Authenticated users can view leads"
  ON crm_leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique INSERT pour authentifiés
CREATE POLICY "Authenticated users can insert leads"
  ON crm_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique INSERT pour anonymes (formulaires publics)
CREATE POLICY "Anonymous can create leads"
  ON crm_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Politique UPDATE pour authentifiés
CREATE POLICY "Authenticated users can update leads"
  ON crm_leads
  FOR UPDATE
  TO authenticated
  USING (true);

-- Politique DELETE pour masters uniquement
CREATE POLICY "Masters can delete leads"
  ON crm_leads
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE role = 'master')
  );

-- Fonction pour updated_at
CREATE OR REPLACE FUNCTION update_crm_leads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger pour updated_at
CREATE TRIGGER update_crm_leads_updated_at_trigger
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_leads_updated_at();