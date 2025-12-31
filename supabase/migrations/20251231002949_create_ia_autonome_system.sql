/*
  # SYSTÈME IA AUTONOME ULTRA-AVANCÉ
  
  OBJECTIF : IA qui apprend, suggère, puis s'auto-exécute après validation
  
  1. Nouvelles Tables
    - `ia_actions_log` - Toutes actions IA suggérées/exécutées
    - `ia_validations` - Validations humaines des suggestions
    - `ia_auto_rules` - Règles automatiques après 10 validations
    - `ia_learning_sessions` - Sessions apprentissage IA
    - `ia_performance_metrics` - Métriques performance IA
    - `email_workflows` - Workflows emails automatiques
    - `email_templates_dynamic` - Templates générés/optimisés par IA
    - `client_contracts` - Contrats clients signés
    - `client_documents` - Documents clients (attestations, etc)
    - `client_invoices` - Factures/primes
    - `sinistres` - Sinistres déclarés
    - `sinistre_actors` - Acteurs sinistres (experts, garages...)
    - `sinistre_exchanges` - Échanges sinistres
    - `cross_sell_opportunities` - Opportunités vente additionnelle
    - `loyalty_program` - Programme fidélité
    - `data_sources_tracking` - Tracking toutes sources données
    
  2. IA Auto-Apprenante
    - Apprend de TOUTES interactions
    - Génère suggestions
    - Compte validations humaines
    - Auto-exécute après 10 validations
    - Optimise templates emails
    - Détecte patterns
    - Génère contenu SEO
    
  3. Automatisations
    - Email devis → demande pièces (immédiat)
    - Relances automatiques
    - Génération attestations
    - Détection opportunités cross-sell
    - Suivi sinistres
    - Coordination acteurs
*/

-- ==============================
-- IA ACTIONS LOG
-- ==============================

CREATE TABLE IF NOT EXISTS ia_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Action
  action_type text NOT NULL, -- 'send_email', 'request_document', 'generate_quote', 'create_task', 'send_sms', etc.
  action_category text NOT NULL, -- 'lead_nurturing', 'contract_management', 'claims', 'cross_sell'
  
  -- Contexte
  entity_type text NOT NULL, -- 'lead', 'contract', 'claim', 'client'
  entity_id uuid NOT NULL,
  
  -- Suggestion ou exécution
  status text DEFAULT 'suggested', -- 'suggested', 'validated', 'rejected', 'auto_executed'
  
  -- Détails action
  action_data jsonb NOT NULL,
  reasoning text NOT NULL,
  confidence_score numeric(5,2) DEFAULT 0,
  
  -- Résultat
  executed_at timestamptz,
  result_data jsonb,
  success boolean,
  
  -- Apprentissage
  feedback_score integer, -- 1-5 étoiles par humain
  feedback_comment text,
  
  -- Meta
  created_by_ia boolean DEFAULT true,
  validated_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ia_actions_status ON ia_actions_log(status, action_type);
CREATE INDEX idx_ia_actions_entity ON ia_actions_log(entity_type, entity_id);
CREATE INDEX idx_ia_actions_category ON ia_actions_log(action_category, created_at DESC);

-- ==============================
-- IA VALIDATIONS & AUTO-RULES
-- ==============================

CREATE TABLE IF NOT EXISTS ia_auto_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Règle
  rule_name text NOT NULL,
  action_type text NOT NULL,
  action_category text NOT NULL,
  
  -- Conditions déclenchement
  trigger_conditions jsonb NOT NULL,
  
  -- Template action
  action_template jsonb NOT NULL,
  
  -- Stats validation
  validation_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  success_rate numeric(5,2) DEFAULT 0,
  
  -- Statut
  is_auto_enabled boolean DEFAULT false, -- true après 10 validations
  auto_enabled_at timestamptz,
  
  -- Performance
  avg_confidence_score numeric(5,2),
  avg_feedback_score numeric(5,2),
  
  created_at timestamptz DEFAULT now(),
  last_executed_at timestamptz
);

CREATE INDEX idx_auto_rules_enabled ON ia_auto_rules(is_auto_enabled, action_type);

-- ==============================
-- IA LEARNING SESSIONS
-- ==============================

CREATE TABLE IF NOT EXISTS ia_learning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_type text NOT NULL, -- 'email_optimization', 'pattern_detection', 'seo_generation', 'customer_behavior'
  
  -- Données apprises
  data_sources text[] DEFAULT '{}',
  insights_discovered jsonb DEFAULT '[]'::jsonb,
  patterns_detected jsonb DEFAULT '[]'::jsonb,
  
  -- Résultats
  actions_generated integer DEFAULT 0,
  rules_created integer DEFAULT 0,
  templates_optimized integer DEFAULT 0,
  
  -- Performance
  session_duration_seconds integer,
  confidence_level numeric(5,2),
  
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- ==============================
-- WORKFLOWS EMAILS AUTOMATIQUES
-- ==============================

CREATE TABLE IF NOT EXISTS email_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Workflow
  workflow_name text NOT NULL,
  trigger_event text NOT NULL, -- 'lead_created', 'quote_sent', 'contract_signed', 'document_missing', etc.
  
  -- Conditions
  trigger_conditions jsonb DEFAULT '{}'::jsonb,
  
  -- Étapes
  steps jsonb NOT NULL, -- Array d'étapes avec delays
  
  -- Stats
  times_triggered integer DEFAULT 0,
  times_completed integer DEFAULT 0,
  avg_conversion_rate numeric(5,2) DEFAULT 0,
  
  -- Statut
  is_active boolean DEFAULT true,
  
  -- IA
  optimized_by_ia boolean DEFAULT false,
  ia_improvements jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workflows par défaut
INSERT INTO email_workflows (workflow_name, trigger_event, steps) VALUES
(
  'Demande pièces après devis',
  'quote_sent',
  '[
    {
      "step": 1,
      "delay_minutes": 5,
      "action": "send_email",
      "template": "request_documents",
      "documents_needed": ["carte_grise", "permis", "kbis"]
    },
    {
      "step": 2,
      "delay_hours": 24,
      "action": "send_reminder",
      "condition": "documents_not_uploaded"
    },
    {
      "step": 3,
      "delay_hours": 72,
      "action": "send_sms",
      "condition": "documents_still_missing"
    }
  ]'::jsonb
),
(
  'Onboarding nouveau client',
  'contract_signed',
  '[
    {
      "step": 1,
      "delay_minutes": 0,
      "action": "send_email",
      "template": "welcome_client"
    },
    {
      "step": 2,
      "delay_hours": 24,
      "action": "send_email",
      "template": "how_to_use_services"
    },
    {
      "step": 3,
      "delay_days": 7,
      "action": "satisfaction_survey"
    },
    {
      "step": 4,
      "delay_days": 30,
      "action": "cross_sell_rc_pro"
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ==============================
-- TEMPLATES EMAILS DYNAMIQUES
-- ==============================

CREATE TABLE IF NOT EXISTS email_templates_dynamic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  template_key text UNIQUE NOT NULL,
  template_name text NOT NULL,
  
  -- Versions A/B/C générées par IA
  versions jsonb DEFAULT '[]'::jsonb,
  active_version integer DEFAULT 1,
  
  -- Performance par version
  version_stats jsonb DEFAULT '{}'::jsonb,
  
  -- Optimisation IA
  last_optimized_at timestamptz,
  optimization_count integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

-- ==============================
-- CONTRATS CLIENTS
-- ==============================

CREATE TABLE IF NOT EXISTS client_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Client
  client_id uuid REFERENCES crm_leads_enhanced(id),
  contract_number text UNIQUE NOT NULL,
  
  -- Assurance
  insurer_id uuid REFERENCES crm_companies_insurers(id),
  policy_number text,
  
  -- Détails contrat
  start_date date NOT NULL,
  end_date date NOT NULL,
  annual_premium numeric(10,2) NOT NULL,
  payment_frequency text DEFAULT 'monthly', -- 'monthly', 'quarterly', 'annual'
  
  -- Véhicules couverts
  vehicles jsonb DEFAULT '[]'::jsonb,
  
  -- Garanties
  guarantees jsonb DEFAULT '[]'::jsonb,
  
  -- Documents
  contract_pdf_url text,
  signed_documents jsonb DEFAULT '[]'::jsonb,
  
  -- Statut
  status text DEFAULT 'active', -- 'active', 'suspended', 'cancelled', 'expired'
  
  -- Dates importantes
  next_payment_date date,
  renewal_date date,
  last_modification_date date,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_contracts_client ON client_contracts(client_id, status);
CREATE INDEX idx_contracts_renewal ON client_contracts(renewal_date ASC);

-- ==============================
-- DOCUMENTS CLIENTS
-- ==============================

CREATE TABLE IF NOT EXISTS client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  contract_id uuid REFERENCES client_contracts(id) ON DELETE CASCADE,
  client_id uuid REFERENCES crm_leads_enhanced(id),
  
  -- Document
  document_type text NOT NULL, -- 'attestation', 'invoice', 'amendment', 'certificate', 'payment_proof'
  document_name text NOT NULL,
  storage_path text NOT NULL,
  
  -- Métadonnées
  document_date date,
  valid_until date,
  amount numeric(10,2),
  
  -- Génération auto
  auto_generated boolean DEFAULT false,
  generated_by_ia boolean DEFAULT false,
  
  -- Statut
  sent_to_client boolean DEFAULT false,
  sent_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_client_docs ON client_documents(client_id, document_type);

-- ==============================
-- FACTURES & PRIMES
-- ==============================

CREATE TABLE IF NOT EXISTS client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  contract_id uuid REFERENCES client_contracts(id),
  client_id uuid REFERENCES crm_leads_enhanced(id),
  
  -- Facture
  invoice_number text UNIQUE NOT NULL,
  invoice_type text NOT NULL, -- 'premium', 'amendment', 'cancellation_refund'
  
  -- Montants
  amount_ht numeric(10,2) NOT NULL,
  amount_ttc numeric(10,2) NOT NULL,
  tax_amount numeric(10,2),
  
  -- Dates
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  
  -- Paiement
  payment_status text DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
  payment_date date,
  payment_method text,
  
  -- Document
  invoice_pdf_url text,
  
  -- Auto
  auto_generated boolean DEFAULT true,
  sent_to_client boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_invoices_client ON client_invoices(client_id, payment_status);
CREATE INDEX idx_invoices_due ON client_invoices(due_date ASC, payment_status);

-- ==============================
-- SINISTRES
-- ==============================

CREATE TABLE IF NOT EXISTS sinistres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  contract_id uuid REFERENCES client_contracts(id),
  client_id uuid REFERENCES crm_leads_enhanced(id),
  
  -- Sinistre
  claim_number text UNIQUE NOT NULL,
  assistance_number text,
  
  -- Détails
  claim_type text NOT NULL, -- 'accident', 'theft', 'vandalism', 'fire', 'glass_damage'
  claim_date date NOT NULL,
  claim_time time,
  claim_location text,
  claim_description text NOT NULL,
  
  -- Responsabilité
  is_at_fault boolean,
  third_party_involved boolean DEFAULT false,
  third_party_details jsonb,
  
  -- Statut
  status text DEFAULT 'declared', -- 'declared', 'under_review', 'expert_assigned', 'in_repair', 'closed', 'rejected'
  
  -- Montants
  estimated_damage numeric(10,2),
  actual_cost numeric(10,2),
  deductible numeric(10,2),
  coverage_amount numeric(10,2),
  
  -- Dates importantes
  expert_visit_date date,
  repair_start_date date,
  repair_end_date date,
  closed_date date,
  
  -- Acteurs
  expert_id uuid,
  garage_id uuid,
  
  -- Documents
  photos jsonb DEFAULT '[]'::jsonb,
  reports jsonb DEFAULT '[]'::jsonb,
  invoices jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sinistres_client ON sinistres(client_id, status);
CREATE INDEX idx_sinistres_status ON sinistres(status, created_at DESC);

-- ==============================
-- ACTEURS SINISTRES
-- ==============================

CREATE TABLE IF NOT EXISTS sinistre_actors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Acteur
  actor_type text NOT NULL, -- 'expert', 'garage', 'assistance', 'lawyer'
  actor_name text NOT NULL,
  
  -- Contact
  contact_name text,
  contact_email text,
  contact_phone text,
  
  -- Liens compagnie
  insurer_id uuid REFERENCES crm_companies_insurers(id),
  
  -- Spécialités
  specialties text[] DEFAULT '{}',
  service_area text[] DEFAULT '{}',
  
  -- Performance
  avg_response_time_hours numeric(10,2),
  avg_satisfaction_score numeric(5,2),
  total_claims_handled integer DEFAULT 0,
  
  -- Statut
  is_active boolean DEFAULT true,
  is_preferred boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_actors_type ON sinistre_actors(actor_type, is_active);
CREATE INDEX idx_actors_insurer ON sinistre_actors(insurer_id, actor_type);

-- ==============================
-- ÉCHANGES SINISTRES
-- ==============================

CREATE TABLE IF NOT EXISTS sinistre_exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  sinistre_id uuid REFERENCES sinistres(id) ON DELETE CASCADE,
  
  -- Échange
  exchange_type text NOT NULL, -- 'email', 'phone', 'sms', 'note'
  direction text NOT NULL, -- 'inbound', 'outbound'
  
  -- Interlocuteur
  actor_type text, -- 'client', 'expert', 'garage', 'insurer', 'assistance'
  actor_id uuid,
  
  -- Contenu
  subject text,
  content text NOT NULL,
  
  -- IA Analysis
  sentiment_score numeric(5,2),
  urgency_level text, -- 'low', 'normal', 'high', 'critical'
  action_items text[] DEFAULT '{}',
  
  -- Auto
  auto_generated boolean DEFAULT false,
  auto_sent boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_exchanges_sinistre ON sinistre_exchanges(sinistre_id, created_at DESC);

-- ==============================
-- OPPORTUNITÉS CROSS-SELL
-- ==============================

CREATE TABLE IF NOT EXISTS cross_sell_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  client_id uuid REFERENCES crm_leads_enhanced(id),
  contract_id uuid REFERENCES client_contracts(id),
  
  -- Opportunité
  opportunity_type text NOT NULL, -- 'rc_pro', 'fleet_expansion', 'badge_telepeage', 'assistance_premium'
  opportunity_name text NOT NULL,
  
  -- Suggestion IA
  detected_by_ia boolean DEFAULT true,
  confidence_score numeric(5,2),
  reasoning text,
  
  -- Détails offre
  estimated_value numeric(10,2),
  discount_offered numeric(5,2),
  
  -- Statut
  status text DEFAULT 'detected', -- 'detected', 'proposed', 'accepted', 'rejected', 'expired'
  
  -- Dates
  proposed_at timestamptz,
  expires_at timestamptz,
  closed_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_cross_sell_client ON cross_sell_opportunities(client_id, status);

-- ==============================
-- PROGRAMME FIDÉLITÉ
-- ==============================

CREATE TABLE IF NOT EXISTS loyalty_program (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  client_id uuid REFERENCES crm_leads_enhanced(id) UNIQUE,
  
  -- Points
  points_balance integer DEFAULT 0,
  points_lifetime integer DEFAULT 0,
  
  -- Niveau
  tier text DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  tier_since timestamptz DEFAULT now(),
  
  -- Parrainages
  referrals_sent integer DEFAULT 0,
  referrals_converted integer DEFAULT 0,
  referral_code text UNIQUE,
  
  -- Récompenses
  rewards_claimed integer DEFAULT 0,
  rewards_value numeric(10,2) DEFAULT 0,
  
  -- Engagement
  last_activity_at timestamptz DEFAULT now(),
  satisfaction_score numeric(5,2),
  
  created_at timestamptz DEFAULT now()
);

-- ==============================
-- TRACKING MULTI-SOURCE
-- ==============================

CREATE TABLE IF NOT EXISTS data_sources_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source
  source_type text NOT NULL, -- 'form_submission', 'email', 'sms', 'phone_call', 'chat', 'backoffice_action'
  source_location text NOT NULL,
  
  -- Données
  data_captured jsonb NOT NULL,
  
  -- Contexte
  entity_type text,
  entity_id uuid,
  user_id uuid,
  
  -- IA Processing
  processed_by_ia boolean DEFAULT false,
  insights_extracted jsonb,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_data_sources ON data_sources_tracking(source_type, created_at DESC);
CREATE INDEX idx_data_processing ON data_sources_tracking(processed_by_ia, created_at ASC);

-- ==============================
-- ROW LEVEL SECURITY
-- ==============================

ALTER TABLE ia_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_auto_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates_dynamic ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sinistres ENABLE ROW LEVEL SECURITY;
ALTER TABLE sinistre_actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sinistre_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_sell_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources_tracking ENABLE ROW LEVEL SECURITY;

-- Auth users peuvent tout voir (commerciaux/admins)
CREATE POLICY "Auth read all" ON ia_actions_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read all" ON client_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read all" ON sinistres FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read all" ON cross_sell_opportunities FOR SELECT TO authenticated USING (true);

-- Manage policies
CREATE POLICY "Auth manage" ON ia_actions_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage" ON client_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage" ON sinistres FOR ALL TO authenticated USING (true) WITH CHECK (true);