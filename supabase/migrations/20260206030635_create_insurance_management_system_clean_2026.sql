/*
  # Système Complet de Gestion d'Assurance Taxi - 2026 (CLEAN)

  Tables créées :
  1. client_taxi_profiles - Profils spécifiques taxi
  2. insurance_contracts - Contrats d'assurance multi-types
  3. contract_guarantees - Garanties par contrat
  4. contract_documents - Documents attachés aux contrats
  5. insurance_claims - Sinistres (déclarations)
  6. claim_documents - Documents de sinistres
  7. payment_schedules - Échéanciers de paiement
  8. payment_incidents - Incidents de paiement
  9. client_tasks - Tâches gestionnaire
  10. client_alerts - Alertes automatiques
  11. client_activity_log - Historique complet
*/

-- Drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS client_activity_log CASCADE;
DROP TABLE IF EXISTS client_alerts CASCADE;
DROP TABLE IF EXISTS client_tasks CASCADE;
DROP TABLE IF EXISTS payment_incidents CASCADE;
DROP TABLE IF EXISTS payment_schedules CASCADE;
DROP TABLE IF EXISTS claim_documents CASCADE;
DROP TABLE IF EXISTS insurance_claims CASCADE;
DROP TABLE IF EXISTS contract_documents CASCADE;
DROP TABLE IF EXISTS contract_guarantees CASCADE;
DROP TABLE IF EXISTS insurance_contracts CASCADE;
DROP TABLE IF EXISTS client_taxi_profiles CASCADE;

-- ================================================================
-- 1. PROFIL TAXI CLIENT
-- ================================================================
CREATE TABLE client_taxi_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE REFERENCES crm_leads(id) ON DELETE CASCADE,
  
  -- Type et structure
  taxi_type text CHECK (taxi_type IN ('artisan', 'societe')),
  company_name text,
  siret text,
  
  -- Licence ADS
  ads_number text,
  ads_issuing_city text,
  ads_start_date date,
  
  -- Info véhicule principal
  plate_number text,
  vehicle_brand text,
  vehicle_model text,
  vehicle_energy text CHECK (vehicle_energy IN ('essence', 'diesel', 'hybride', 'electrique', 'gpl')),
  first_registration_date date,
  vehicle_usage text CHECK (vehicle_usage IN ('taxi', 'vtc', 'taxi_vtc')),
  
  -- Statut conducteur
  driver_status text CHECK (driver_status IN ('owner_driver', 'employee_driver')),
  
  -- Documents checklist
  documents_checklist jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_client_taxi_lead ON client_taxi_profiles(lead_id);

-- ================================================================
-- 2. CONTRATS D'ASSURANCE
-- ================================================================
CREATE TABLE insurance_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  
  -- Type de contrat
  contract_type text NOT NULL CHECK (contract_type IN (
    'auto_taxi', 'rc_pro_taxi', 'protection_juridique', 
    'prevoyance', 'sante_tns', 'multirisque_pro'
  )),
  
  -- Assureur
  insurer_company_id uuid REFERENCES insurance_companies(id),
  insurer_name text NOT NULL,
  contract_number text,
  
  -- Garanties
  main_guarantees text,
  franchise_amount numeric(10, 2),
  
  -- Primes
  premium_ht numeric(10, 2),
  premium_ttc numeric(10, 2) NOT NULL,
  payment_frequency text CHECK (payment_frequency IN ('mensuel', 'trimestriel', 'annuel')),
  
  -- Commission
  commission_percent numeric(5, 2),
  commission_amount numeric(10, 2),
  
  -- Dates
  effective_date date NOT NULL,
  renewal_date date NOT NULL,
  termination_date date,
  
  -- Statut
  status text NOT NULL DEFAULT 'quote' CHECK (status IN ('quote', 'active', 'suspended', 'terminated')),
  
  internal_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

CREATE INDEX idx_insurance_contracts_lead ON insurance_contracts(lead_id);
CREATE INDEX idx_insurance_contracts_status ON insurance_contracts(status);

-- ================================================================
-- 3. GARANTIES DÉTAILLÉES
-- ================================================================
CREATE TABLE contract_guarantees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES insurance_contracts(id) ON DELETE CASCADE,
  
  guarantee_name text NOT NULL,
  guarantee_description text,
  coverage_amount numeric(12, 2),
  franchise numeric(10, 2),
  is_included boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_contract_guarantees_contract ON contract_guarantees(contract_id);

-- ================================================================
-- 4. DOCUMENTS DE CONTRATS
-- ================================================================
CREATE TABLE contract_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES insurance_contracts(id) ON DELETE CASCADE,
  
  document_type text NOT NULL CHECK (document_type IN (
    'contrat_initial', 'avenant', 'attestation', 'conditions_generales',
    'conditions_particulieres', 'fiche_info', 'avis_echeance', 'autre'
  )),
  
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  
  document_date date,
  avenant_number text,
  
  uploaded_by uuid REFERENCES admin_users(id),
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_contract_documents_contract ON contract_documents(contract_id);

-- ================================================================
-- 5. SINISTRES
-- ================================================================
CREATE TABLE insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES insurance_contracts(id) ON DELETE SET NULL,
  
  claim_type text NOT NULL CHECK (claim_type IN (
    'accident_responsable', 'accident_non_responsable', 'bris_de_glace',
    'vol', 'incendie', 'corporel_conducteur', 'degats_materiels', 'autre'
  )),
  
  claim_date date NOT NULL,
  declaration_date date DEFAULT CURRENT_DATE,
  
  vehicle_plate text,
  circumstances text NOT NULL,
  location text,
  
  insurer_claim_number text,
  
  status text NOT NULL DEFAULT 'declared' CHECK (status IN (
    'declared', 'under_investigation', 'expert_appointed',
    'repair_in_progress', 'settled', 'rejected', 'closed'
  )),
  
  estimated_amount numeric(12, 2),
  paid_amount numeric(12, 2),
  
  internal_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

CREATE INDEX idx_insurance_claims_lead ON insurance_claims(lead_id);
CREATE INDEX idx_insurance_claims_contract ON insurance_claims(contract_id);

-- ================================================================
-- 6. DOCUMENTS DE SINISTRES
-- ================================================================
CREATE TABLE claim_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES insurance_claims(id) ON DELETE CASCADE,
  
  document_type text NOT NULL CHECK (document_type IN (
    'constat_amiable', 'photos', 'rapport_police',
    'rapport_expert', 'factures', 'courrier_assureur', 'autre'
  )),
  
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  
  uploaded_by uuid REFERENCES admin_users(id),
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_claim_documents_claim ON claim_documents(claim_id);

-- ================================================================
-- 7. ÉCHÉANCIERS DE PAIEMENT
-- ================================================================
CREATE TABLE payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES insurance_contracts(id) ON DELETE CASCADE,
  
  due_date date NOT NULL,
  amount_due numeric(10, 2) NOT NULL,
  
  payment_date date,
  amount_paid numeric(10, 2),
  payment_method text,
  payment_reference text,
  
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'late', 'unpaid')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_payment_schedules_contract ON payment_schedules(contract_id);

-- ================================================================
-- 8. INCIDENTS DE PAIEMENT
-- ================================================================
CREATE TABLE payment_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES insurance_contracts(id) ON DELETE CASCADE,
  payment_schedule_id uuid REFERENCES payment_schedules(id) ON DELETE SET NULL,
  
  incident_type text NOT NULL CHECK (incident_type IN (
    'unpaid_premium', 'rejected_payment', 'grace_period', 'suspension_triggered'
  )),
  
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(10, 2) NOT NULL,
  
  resolution_status text DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'unresolved')),
  
  resolution_date date,
  resolution_notes text,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

CREATE INDEX idx_payment_incidents_contract ON payment_incidents(contract_id);

-- ================================================================
-- 9. TÂCHES GESTIONNAIRE
-- ================================================================
CREATE TABLE client_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES insurance_contracts(id) ON DELETE SET NULL,
  
  task_type text NOT NULL CHECK (task_type IN (
    'call_client', 'send_attestation', 'update_vehicle',
    'follow_up_payment', 'send_renewal', 'request_documents', 'other'
  )),
  
  title text NOT NULL,
  description text,
  due_date date,
  
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  
  assigned_to uuid REFERENCES admin_users(id),
  completed_at timestamptz,
  completed_by uuid REFERENCES admin_users(id),
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

CREATE INDEX idx_client_tasks_lead ON client_tasks(lead_id);
CREATE INDEX idx_client_tasks_status ON client_tasks(status);

-- ================================================================
-- 10. ALERTES AUTOMATIQUES
-- ================================================================
CREATE TABLE client_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES insurance_contracts(id) ON DELETE SET NULL,
  
  alert_type text NOT NULL CHECK (alert_type IN (
    'contract_renewal', 'document_expiring', 'payment_overdue',
    'license_expiring', 'missing_documents', 'claim_follow_up'
  )),
  
  title text NOT NULL,
  message text NOT NULL,
  
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  trigger_date date NOT NULL,
  
  dismissed boolean DEFAULT false,
  dismissed_at timestamptz,
  dismissed_by uuid REFERENCES admin_users(id),
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_client_alerts_lead ON client_alerts(lead_id);

-- ================================================================
-- 11. HISTORIQUE COMPLET
-- ================================================================
CREATE TABLE client_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  
  activity_type text NOT NULL CHECK (activity_type IN (
    'contract_created', 'contract_modified', 'contract_suspended',
    'contract_terminated', 'claim_declared', 'claim_updated',
    'payment_received', 'payment_incident', 'document_uploaded',
    'note_added', 'status_changed', 'task_created', 'alert_triggered', 'other'
  )),
  
  title text NOT NULL,
  description text,
  
  contract_id uuid REFERENCES insurance_contracts(id) ON DELETE SET NULL,
  claim_id uuid REFERENCES insurance_claims(id) ON DELETE SET NULL,
  
  metadata jsonb,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

CREATE INDEX idx_activity_log_lead ON client_activity_log(lead_id);
CREATE INDEX idx_activity_log_date ON client_activity_log(created_at DESC);

-- ================================================================
-- RLS POLICIES
-- ================================================================

ALTER TABLE client_taxi_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_guarantees ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activity_log ENABLE ROW LEVEL SECURITY;

-- Admin access for all tables
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'client_taxi_profiles', 'insurance_contracts', 'contract_guarantees',
    'contract_documents', 'insurance_claims', 'claim_documents',
    'payment_schedules', 'payment_incidents', 'client_tasks',
    'client_alerts', 'client_activity_log'
  ]
  LOOP
    EXECUTE format('
      CREATE POLICY "Admin full access on %I"
        ON %I FOR ALL
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
          )
        )
    ', table_name, table_name);
  END LOOP;
END $$;