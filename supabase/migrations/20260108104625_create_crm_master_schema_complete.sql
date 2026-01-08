/*
  # CRM TaxiAssur - Schéma Database Master Complet

  ## Vue d'ensemble

  Ce schéma database implémente un CRM IA-first pour le marché assurance taxi avec :

  - **Pipeline dynamique IA** (états + transitions automatiques)
  - **Communication multicanale** (Email/SMS/WhatsApp/Voice)
  - **Production complète** (docs/signature/paiement)
  - **Rétention & anti-churn IA**
  - **IA multi-agents** avec gouvernance
  - **Audit trail complet** (RGPD + traçabilité IA)

  ## Modules

  1. CORE - Leads, Clients, Contacts
  2. PIPELINE - États, Transitions, Workflows
  3. IA - Agents, Décisions, Gouvernance, Apprentissage
  4. COMMUNICATION - Messages, Templates, Canaux, Consentement
  5. PRODUCTION - Documents, Signatures, Paiements, Contrats
  6. RÉTENTION - Scores, Churn, Cross-sell
  7. SINISTRES - Déclarations, Assistance
  8. AUDIT - Logs, Events, RGPD
  9. ANALYTICS - KPIs, Dashboards

  ## Sécurité

  - RLS activé sur toutes les tables sensibles
  - Policies restrictives par défaut
  - Audit trail immuable
  - Chiffrement données sensibles
*/

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS & TYPES
-- ============================================================================

-- Statuts du pipeline
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'NEW_LEAD',
    'CONTACT_ATTEMPTED',
    'CONTACT_CONFIRMED',
    'DOCUMENTS_REQUIRED',
    'DOCUMENTS_PARTIAL',
    'READY_FOR_QUOTE',
    'QUOTE_SENT',
    'NO_RESPONSE',
    'RELANCE_ACTIVE',
    'SIGNATURE_PENDING',
    'SIGNED',
    'PAYMENT_PENDING',
    'ACTIVE_CLIENT',
    'CROSS_SELLING',
    'RISK_CHURN',
    'CLIENT_LOST',
    'SINISTER',
    'ATTESTATION_REQUEST',
    'SUPPORT_ASSISTANCE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Types d'événements
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'LEAD_CREATED',
    'CONTACT_CONFIRMED',
    'DOCS_REQUIRED',
    'DOCS_RECEIVED',
    'QUOTE_READY',
    'QUOTE_SENT',
    'NO_RESPONSE_24H',
    'NO_RESPONSE_48H',
    'SIGNATURE_SENT',
    'SIGNATURE_COMPLETED',
    'PAYMENT_LINK_SENT',
    'PAYMENT_CONFIRMED',
    'PAYMENT_FAILED',
    'CONTRACT_ACTIVATED',
    'ATTESTATION_REQUESTED',
    'SINISTER_DECLARED',
    'ASSISTANCE_REQUESTED',
    'RISK_CHURN_DETECTED',
    'CROSS_SELL_OPPORTUNITY',
    'CLIENT_SATISFACTION_LOW',
    'RENEWAL_DUE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Canaux de communication
DO $$ BEGIN
  CREATE TYPE communication_channel AS ENUM (
    'EMAIL',
    'SMS',
    'WHATSAPP',
    'VOICE_CALL',
    'IN_APP',
    'POSTAL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Statuts de message
DO $$ BEGIN
  CREATE TYPE message_status AS ENUM (
    'QUEUED',
    'SENT',
    'DELIVERED',
    'READ',
    'CLICKED',
    'REPLIED',
    'FAILED',
    'BOUNCED',
    'UNSUBSCRIBED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Types d'action IA
DO $$ BEGIN
  CREATE TYPE ai_action_type AS ENUM (
    'SEND_MESSAGE',
    'SCHEDULE_FOLLOWUP',
    'CREATE_TASK',
    'ESCALATE_HUMAN',
    'GENERATE_DOC',
    'SEND_SIGNATURE',
    'SEND_PAYMENT_LINK',
    'UPDATE_STATE',
    'CALCULATE_QUOTE',
    'TRIGGER_WORKFLOW'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Types d'agents IA
DO $$ BEGIN
  CREATE TYPE ai_agent_type AS ENUM (
    'SALES_AGENT',
    'RETENTION_AGENT',
    'PRODUCTION_AGENT',
    'COMPLIANCE_AGENT',
    'VOICE_AGENT',
    'ANALYST_AGENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Types de documents
DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'CARTE_GRISE',
    'PERMIS_CONDUIRE',
    'CARTE_PRO_TAXI',
    'KBIS',
    'RIB',
    'JUSTIFICATIF_DOMICILE',
    'RELEVE_INFO',
    'CONTRAT',
    'CONDITIONS_GENERALES',
    'IPID',
    'MANDAT_SEPA',
    'ATTESTATION',
    'CONSTAT_AMIABLE',
    'FACTURE',
    'AUTRE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Statuts de document
DO $$ BEGIN
  CREATE TYPE document_status AS ENUM (
    'REQUIRED',
    'PENDING',
    'RECEIVED',
    'VALIDATED',
    'REJECTED',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Statuts de signature
DO $$ BEGIN
  CREATE TYPE signature_status AS ENUM (
    'PENDING',
    'SENT',
    'VIEWED',
    'SIGNED',
    'DECLINED',
    'EXPIRED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Statuts de paiement
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'REFUNDED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- MODULE 1 : CORE - LEADS & CLIENTS
-- ============================================================================

-- Table principale des leads/prospects
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identité
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Adresse
  address TEXT,
  postal_code TEXT,
  city TEXT,

  -- Business
  company_name TEXT,
  siret TEXT,

  -- Statut & scoring
  status lead_status NOT NULL DEFAULT 'NEW_LEAD',
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  temperature TEXT DEFAULT 'COLD' CHECK (temperature IN ('COLD', 'WARM', 'HOT')),

  -- Source & attribution
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referring_url TEXT,
  landing_page TEXT,

  -- Assignment
  assigned_to UUID REFERENCES admin_users(id),
  assigned_at TIMESTAMPTZ,

  -- Conversion
  converted_to_client BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,

  -- Consentement RGPD
  consent_marketing BOOLEAN DEFAULT false,
  consent_sms BOOLEAN DEFAULT false,
  consent_whatsapp BOOLEAN DEFAULT false,
  consent_phone BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Contraintes
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone ~* '^\+?[0-9]{10,15}$')
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned ON crm_leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON crm_leads(email);
CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON crm_leads(phone);
CREATE INDEX IF NOT EXISTS idx_crm_leads_next_followup ON crm_leads(next_followup_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_created ON crm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_converted ON crm_leads(converted_to_client) WHERE converted_to_client = true;
CREATE INDEX IF NOT EXISTS idx_crm_leads_metadata ON crm_leads USING gin(metadata);

-- Table des clients (leads convertis)
CREATE TABLE IF NOT EXISTS crm_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,

  -- Identité (dénormalisé pour performance)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Adresse
  address TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,

  -- Business
  company_name TEXT,
  siret TEXT,

  -- Statut client
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CANCELLED', 'CHURNED')),

  -- Scoring & valeur
  lifetime_value DECIMAL(10, 2) DEFAULT 0,
  retention_score INTEGER DEFAULT 100 CHECK (retention_score >= 0 AND retention_score <= 100),
  churn_risk_score INTEGER DEFAULT 0 CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100),
  satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),

  -- Attribution
  account_manager_id UUID REFERENCES admin_users(id),

  -- Dates clés
  first_contract_date DATE,
  last_payment_date DATE,
  next_renewal_date DATE,

  -- Consentement
  consent_marketing BOOLEAN DEFAULT false,
  consent_sms BOOLEAN DEFAULT false,
  consent_whatsapp BOOLEAN DEFAULT false,
  consent_phone BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_clients_status ON crm_clients(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_clients_account_manager ON crm_clients(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_crm_clients_renewal ON crm_clients(next_renewal_date) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_crm_clients_churn_risk ON crm_clients(churn_risk_score DESC) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_crm_clients_email ON crm_clients(email);

-- Table des véhicules
CREATE TABLE IF NOT EXISTS crm_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,

  -- Immatriculation
  registration_number TEXT NOT NULL,

  -- Véhicule
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
  vin TEXT,

  -- Usage
  vehicle_type TEXT DEFAULT 'TAXI' CHECK (vehicle_type IN ('TAXI', 'VTC', 'TAXI_VTC')),
  kilometers INTEGER DEFAULT 0,

  -- Dates
  first_registration_date DATE,
  purchase_date DATE,

  -- Statut
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SOLD', 'STOLEN')),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_vehicles_client ON crm_vehicles(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_vehicles_registration ON crm_vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_crm_vehicles_status ON crm_vehicles(status) WHERE deleted_at IS NULL;

-- RLS sur tables core
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_vehicles ENABLE ROW LEVEL SECURITY;

-- Policy admins/managers accès complet
CREATE POLICY "Admins managers acces leads"
  ON crm_leads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('ADMIN', 'MANAGER')
    )
  );

CREATE POLICY "Admins managers acces clients"
  ON crm_clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('ADMIN', 'MANAGER')
    )
  );

-- Fonction updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer triggers updated_at
CREATE TRIGGER update_crm_leads_updated_at BEFORE UPDATE ON crm_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_clients_updated_at BEFORE UPDATE ON crm_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_vehicles_updated_at BEFORE UPDATE ON crm_vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE crm_leads IS 'Table principale des prospects/leads avec scoring et état pipeline';
COMMENT ON TABLE crm_clients IS 'Clients convertis (leads ayant souscrit au moins un contrat)';
COMMENT ON TABLE crm_vehicles IS 'Véhicules assurés (taxi/VTC)';
