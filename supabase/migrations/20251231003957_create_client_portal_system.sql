/*
  # ESPACE CLIENT ULTRA-COMPLET
  
  OBJECTIF : Espace client #1 du marché avec automatisation totale
  
  1. Nouvelles Tables
    - `client_portal_users` - Comptes clients avec auth
    - `document_templates` - Templates documents par type contrat/compagnie
    - `client_document_requests` - Demandes documents automatiques
    - `client_portal_activities` - Activités clients (logs)
    - `document_categories` - Catégories documents organisées
    - `automated_email_sequences` - Séquences emails automatiques
    
  2. Fonctionnalités
    - Auth client sécurisée
    - Documents automatiques selon contrat/compagnie
    - Upload pièces simplifié
    - Emails automatiques relances
    - Suivi temps réel
    - Notifications intelligentes
    
  3. Documents Templates
    - Par type contrat (Général, MFA, AXA, etc)
    - Par activité (Taxi, VTC, Moto-taxi)
    - Documents légaux requis
    - Génération automatique
*/

-- ==============================
-- COMPTES CLIENT PORTAL
-- ==============================

CREATE TABLE IF NOT EXISTS client_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lien contrat
  client_id uuid REFERENCES crm_leads_enhanced(id) UNIQUE,
  contract_id uuid REFERENCES client_contracts(id),
  
  -- Auth
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  phone text,
  
  -- Profil
  first_name text NOT NULL,
  last_name text NOT NULL,
  company_name text,
  
  -- Statut
  is_active boolean DEFAULT true,
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  
  -- Sécurité
  last_login_at timestamptz,
  login_count integer DEFAULT 0,
  failed_login_attempts integer DEFAULT 0,
  password_reset_token text,
  password_reset_expires timestamptz,
  
  -- Préférences
  notification_preferences jsonb DEFAULT '{"email": true, "sms": true, "push": false}'::jsonb,
  language text DEFAULT 'fr',
  
  -- Meta
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_portal_users_email ON client_portal_users(email);
CREATE INDEX idx_portal_users_client ON client_portal_users(client_id);

-- ==============================
-- CATÉGORIES DOCUMENTS
-- ==============================

CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  category_key text UNIQUE NOT NULL,
  category_name text NOT NULL,
  description text,
  icon text,
  display_order integer DEFAULT 0,
  
  -- Organisation
  parent_category_id uuid REFERENCES document_categories(id),
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Catégories principales
INSERT INTO document_categories (category_key, category_name, description, icon, display_order) VALUES
('contract_general', 'Documents Contrat Général', 'Conditions générales et convention assistance', 'FileText', 1),
('contract_insurer', 'Documents Compagnie', 'Documents spécifiques à votre assureur', 'Building', 2),
('identity', 'Pièces Identité', 'CNI, Permis, Carte Pro Taxi', 'User', 3),
('vehicle', 'Documents Véhicule', 'Carte grise, Contrôle technique', 'Car', 4),
('professional', 'Documents Professionnels', 'Autorisation stationnement, KBIS', 'Briefcase', 5),
('payment', 'Informations Paiement', 'RIB, Mandats SEPA', 'CreditCard', 6),
('insurance_history', 'Historique Assurance', 'Relevés information, Résiliations', 'History', 7),
('lease', 'Contrats LOA/Leasing', 'Contrats location, Perte financière', 'FileContract', 8)
ON CONFLICT (category_key) DO NOTHING;

-- ==============================
-- TEMPLATES DOCUMENTS
-- ==============================

CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template
  template_key text UNIQUE NOT NULL,
  template_name text NOT NULL,
  description text,
  
  -- Catégorie
  category_id uuid REFERENCES document_categories(id),
  
  -- Conditions application
  applies_to_contract_types text[] DEFAULT '{}', -- ['general', 'mfa', 'axa']
  applies_to_activity_types text[] DEFAULT '{}', -- ['taxi', 'vtc', 'moto_taxi']
  
  -- Document
  document_type text NOT NULL, -- 'to_provide', 'to_sign', 'to_download', 'generated'
  file_url text,
  is_mandatory boolean DEFAULT false,
  
  -- Validation
  requires_validation boolean DEFAULT true,
  validation_rules jsonb DEFAULT '{}'::jsonb,
  
  -- Instructions
  instructions_for_client text,
  example_url text,
  
  -- Ordre affichage
  display_order integer DEFAULT 0,
  
  -- Statut
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_templates_type ON document_templates(document_type, is_active);
CREATE INDEX idx_templates_category ON document_templates(category_id);

-- Templates documents GÉNÉRAUX (tous contrats)
INSERT INTO document_templates (
  template_key, template_name, description, category_id, applies_to_contract_types,
  applies_to_activity_types, document_type, is_mandatory, instructions_for_client, display_order
) VALUES
(
  'cg_generales',
  'Conditions Générales',
  'Conditions générales du contrat d''assurance',
  (SELECT id FROM document_categories WHERE category_key = 'contract_general'),
  ARRAY['general', 'mfa', 'axa', 'generali'],
  ARRAY['taxi', 'vtc', 'moto_taxi'],
  'to_download',
  true,
  'Document à conserver. Décrit vos garanties et obligations.',
  1
),
(
  'convention_assistance',
  'Convention Assistance',
  'Convention d''assistance 24/7',
  (SELECT id FROM document_categories WHERE category_key = 'contract_general'),
  ARRAY['general', 'mfa', 'axa', 'generali'],
  ARRAY['taxi', 'vtc', 'moto_taxi'],
  'to_download',
  true,
  'Numéros et procédures assistance en cas de panne/accident.',
  2
);

-- Templates documents MFA spécifiques
INSERT INTO document_templates (
  template_key, template_name, description, category_id, applies_to_contract_types,
  applies_to_activity_types, document_type, is_mandatory, instructions_for_client, display_order
) VALUES
(
  'cg_mfa',
  'Conditions Générales MFA',
  'Conditions générales spécifiques MFA',
  (SELECT id FROM document_categories WHERE category_key = 'contract_insurer'),
  ARRAY['mfa'],
  ARRAY['taxi', 'vtc'],
  'to_download',
  true,
  'Document spécifique à votre assureur MFA.',
  1
),
(
  'questionnaire_mfa',
  'Questionnaire MFA',
  'Questionnaire déclaration risque MFA',
  (SELECT id FROM document_categories WHERE category_key = 'contract_insurer'),
  ARRAY['mfa'],
  ARRAY['taxi', 'vtc'],
  'to_sign',
  true,
  'À compléter et signer électroniquement.',
  2
),
(
  'ipid_mfa',
  'IPID MFA',
  'Document d''information produit (IPID)',
  (SELECT id FROM document_categories WHERE category_key = 'contract_insurer'),
  ARRAY['mfa'],
  ARRAY['taxi', 'vtc'],
  'to_download',
  true,
  'Résumé simplifié de vos garanties.',
  3
);

-- Templates PIÈCES À FOURNIR - Identité
INSERT INTO document_templates (
  template_key, template_name, description, category_id, applies_to_contract_types,
  applies_to_activity_types, document_type, is_mandatory, instructions_for_client, display_order
) VALUES
(
  'cni_recto_verso',
  'Carte Nationale d''Identité',
  'CNI recto-verso en cours de validité',
  (SELECT id FROM document_categories WHERE category_key = 'identity'),
  ARRAY['general', 'mfa', 'axa', 'generali'],
  ARRAY['taxi', 'vtc', 'moto_taxi'],
  'to_provide',
  true,
  'Scannez RECTO et VERSO en un seul fichier. Accepté : PDF, JPG, PNG max 5Mo.',
  1
),
(
  'permis_conduire',
  'Permis de Conduire',
  'Permis recto-verso en cours de validité',
  (SELECT id FROM document_categories WHERE category_key = 'identity'),
  ARRAY['general', 'mfa', 'axa', 'generali'],
  ARRAY['taxi', 'vtc', 'moto_taxi'],
  'to_provide',
  true,
  'Scannez RECTO et VERSO. Vérifiez que toutes infos sont lisibles.',
  2
),
(
  'carte_pro_taxi',
  'Carte Professionnelle Taxi',
  'Carte pro délivrée par la préfecture',
  (SELECT id FROM document_categories WHERE category_key = 'identity'),
  ARRAY['general', 'mfa', 'axa', 'generali'],
  ARRAY['taxi'],
  'to_provide',
  true,
  'Carte professionnelle taxi en cours de validité.',
  3
);

-- Templates VÉHICULE
INSERT INTO document_templates (
  template_key, template_name, description, category_id, applies_to_contract_types,
  applies_to_activity_types, document_type, is_mandatory, instructions_for_client, display_order
) VALUES
(
  'carte_grise',
  'Carte Grise (Certificat Immatriculation)',
  'Certificat d''immatriculation du véhicule',
  (SELECT id FROM document_categories WHERE category_key = 'vehicle'),
  ARRAY['general', 'mfa', 'axa', 'generali'],
  ARRAY['taxi', 'vtc', 'moto_taxi'],
  'to_provide',
  true,
  'Carte grise RECTO-VERSO. Vous devez être propriétaire ou locataire (LOA).',
  1
);

-- Templates PROFESSIONNELS
INSERT INTO document_templates (
  template_key, template_name, description, category_id, applies_to_contract_types,
  applies_to_activity_types, document_type, is_mandatory, instructions_for_client, display_order
) VALUES
(
  'autorisation_stationnement',
  'Autorisation Stationnement Ville',
  'Autorisation de stationnement délivrée par votre mairie',
  (SELECT id FROM document_categories WHERE category_key = 'professional'),
  ARRAY['general', 'mfa', 'axa', 'generali'],
  ARRAY['taxi'],
  'to_provide',
  true,
  'Document officiel de votre mairie autorisant le stationnement taxi.',
  1
),
(
  'kbis',
  'Extrait KBIS',
  'KBIS de moins de 3 mois si société',
  (SELECT id FROM document_categories WHERE category_key = 'professional'),
  ARRAY['general', 'mfa', 'axa', 'generali'],
  ARRAY['taxi', 'vtc'],
  'to_provide',
  false,
  'Uniquement si vous exercez en société (SARL, SAS, etc). KBIS de moins de 3 mois.',
  2
);

-- Templates PAIEMENT
INSERT INTO document_templates (
  template_key, template_name, description, category_id, applies_to_contract_types,
  applies_to_activity_types, document_type, is_mandatory, instructions_for_client, display_order
) VALUES
(
  'rib',
  'RIB',
  'Relevé d''Identité Bancaire pour prélèvement',
  (SELECT id FROM document_categories WHERE category_key = 'payment'),
  ARRAY['general', 'mfa', 'axa', 'generali'],
  ARRAY['taxi', 'vtc', 'moto_taxi'],
  'to_provide',
  true,
  'RIB au nom du souscripteur. IBAN français de préférence.',
  1
),
(
  'mandat_sepa',
  'Mandat SEPA',
  'Autorisation prélèvement SEPA',
  (SELECT id FROM document_categories WHERE category_key = 'payment'),
  ARRAY['general', 'mfa', 'axa', 'generali'],
  ARRAY['taxi', 'vtc', 'moto_taxi'],
  'to_sign',
  true,
  'À signer électroniquement pour autoriser prélèvements mensuels.',
  2
);

-- Templates HISTORIQUE ASSURANCE
INSERT INTO document_templates (
  template_key, template_name, description, category_id, applies_to_contract_types,
  applies_to_activity_types, document_type, is_mandatory, instructions_for_client, display_order
) VALUES
(
  'releve_info_3ans',
  'Relevé d''Information 3 ans',
  'Relevé info assurance des 3 dernières années minimum',
  (SELECT id FROM document_categories WHERE category_key = 'insurance_history'),
  ARRAY['general', 'mfa', 'axa', 'generali'],
  ARRAY['taxi', 'vtc', 'moto_taxi'],
  'to_provide',
  true,
  'Demandez-le à votre ancien assureur. Obligatoire pour calcul tarif.',
  1
);

-- Templates LEASING
INSERT INTO document_templates (
  template_key, template_name, description, category_id, applies_to_contract_types,
  applies_to_activity_types, document_type, is_mandatory, instructions_for_client, display_order
) VALUES
(
  'contrat_leasing',
  'Contrat LOA/Leasing',
  'Contrat location longue durée avec option achat',
  (SELECT id FROM document_categories WHERE category_key = 'lease'),
  ARRAY['general', 'mfa', 'axa', 'generali'],
  ARRAY['taxi', 'vtc', 'moto_taxi'],
  'to_provide',
  false,
  'Si véhicule en LOA/Leasing : contrat complet pour garantie perte financière.',
  1
);

-- ==============================
-- DEMANDES DOCUMENTS CLIENTS
-- ==============================

CREATE TABLE IF NOT EXISTS client_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Client
  portal_user_id uuid REFERENCES client_portal_users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES crm_leads_enhanced(id),
  contract_id uuid REFERENCES client_contracts(id),
  
  -- Template
  template_id uuid REFERENCES document_templates(id),
  template_key text NOT NULL,
  
  -- Statut
  status text DEFAULT 'pending', -- 'pending', 'uploaded', 'validated', 'rejected', 'expired'
  
  -- Upload
  uploaded_file_path text,
  uploaded_file_name text,
  uploaded_at timestamptz,
  file_size_bytes integer,
  
  -- Validation
  validated_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  rejection_reason text,
  
  -- Relances
  reminder_count integer DEFAULT 0,
  last_reminder_sent_at timestamptz,
  
  -- Expiration
  requested_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '30 days'),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_doc_requests_user ON client_document_requests(portal_user_id, status);
CREATE INDEX idx_doc_requests_status ON client_document_requests(status, expires_at);

-- ==============================
-- ACTIVITÉS CLIENT PORTAL
-- ==============================

CREATE TABLE IF NOT EXISTS client_portal_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  portal_user_id uuid REFERENCES client_portal_users(id) ON DELETE CASCADE,
  
  -- Activité
  activity_type text NOT NULL, -- 'login', 'document_upload', 'document_download', 'claim_declared', 'message_sent'
  activity_description text NOT NULL,
  
  -- Métadonnées
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_portal_activities ON client_portal_activities(portal_user_id, created_at DESC);

-- ==============================
-- SÉQUENCES EMAILS AUTOMATIQUES
-- ==============================

CREATE TABLE IF NOT EXISTS automated_email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  sequence_key text UNIQUE NOT NULL,
  sequence_name text NOT NULL,
  description text,
  
  -- Déclencheur
  trigger_event text NOT NULL, -- 'contract_signed', 'document_missing', 'document_expired'
  trigger_conditions jsonb DEFAULT '{}'::jsonb,
  
  -- Étapes
  steps jsonb NOT NULL,
  
  -- Stats
  times_triggered integer DEFAULT 0,
  success_rate numeric(5,2) DEFAULT 0,
  
  -- Statut
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now()
);

-- Séquence onboarding client
INSERT INTO automated_email_sequences (sequence_key, sequence_name, trigger_event, steps) VALUES
(
  'client_onboarding_documents',
  'Onboarding Client - Dépôt Documents',
  'contract_signed',
  '[
    {
      "step": 1,
      "delay_minutes": 10,
      "action": "send_email",
      "template": "welcome_portal",
      "subject": "🎉 Bienvenue ! Accédez à votre espace client",
      "priority": "high"
    },
    {
      "step": 2,
      "delay_hours": 24,
      "action": "send_email",
      "template": "reminder_documents_missing",
      "condition": "has_missing_documents",
      "subject": "📄 Documents manquants - 5 min pour finaliser"
    },
    {
      "step": 3,
      "delay_hours": 72,
      "action": "send_sms",
      "condition": "has_missing_documents",
      "message": "TaxiAssur : Des documents sont en attente. Connectez-vous : https://taxiassur.com/espace-client"
    },
    {
      "step": 4,
      "delay_days": 7,
      "action": "send_email",
      "template": "urgent_documents",
      "condition": "has_missing_documents",
      "subject": "⚠️ URGENT : Documents requis pour activer votre contrat"
    }
  ]'::jsonb
),
(
  'document_validation_success',
  'Documents Validés',
  'all_documents_validated',
  '[
    {
      "step": 1,
      "delay_minutes": 0,
      "action": "send_email",
      "template": "docs_validated",
      "subject": "✅ Vos documents sont validés ! Contrat actif"
    },
    {
      "step": 2,
      "delay_hours": 24,
      "action": "send_email",
      "template": "how_to_use_portal",
      "subject": "🎓 Guide : Tout savoir sur votre espace client"
    }
  ]'::jsonb
)
ON CONFLICT (sequence_key) DO NOTHING;

-- ==============================
-- ROW LEVEL SECURITY
-- ==============================

ALTER TABLE client_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_email_sequences ENABLE ROW LEVEL SECURITY;

-- Clients peuvent lire leurs propres données uniquement
CREATE POLICY "Clients read own data" ON client_portal_users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Clients read own requests" ON client_document_requests
  FOR SELECT
  USING (portal_user_id IN (SELECT id FROM client_portal_users WHERE auth.uid() = id));

-- Admins/commerciaux accès complet
CREATE POLICY "Auth manage all" ON client_portal_users
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Auth manage all" ON client_document_requests
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Templates publics lecture
CREATE POLICY "Public read templates" ON document_templates
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public read categories" ON document_categories
  FOR SELECT
  USING (is_active = true);