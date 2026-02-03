/*
  # Pipeline Commercial TaxiAssur - 7 Étapes Complètes

  1. Nouvelles Tables & Colonnes
    - Ajout de `pipeline_stage` à crm_leads avec 7 étapes précises
    - `lead_quote_validations` : Validation des devis par prospects
    - `lead_rib_uploads` : Upload et validation des RIB
    - `lead_contract_documents` : Documents finaux (contrat, attestation, mémo)
    - `crm_communication_templates` : Templates d'emails/SMS/WhatsApp
    - `lead_signature_history` : Historique des signatures

  2. Les 7 Étapes du Pipeline
    - Étape 1 : nouveau_lead (Contact multi-canal + qualification besoin)
    - Étape 2 : collecte_documents (Récupération + validation documents)
    - Étape 3 : saisie_devis (Upload 5 devis compagnies)
    - Étape 4 : validation_devis_prospect (Prospect choisit son devis)
    - Étape 5 : signature_devis (Signature électronique externe + confirmation)
    - Étape 6 : paiement_rib (Upload RIB pour prélèvement)
    - Étape 7 : contrat_signature (Documents finaux → Client)

  3. Sécurité
    - RLS activé sur toutes les tables
    - Accès authentifié pour admin
    - Accès via token pour prospects
*/

-- ============================================================================
-- 1. MISE À JOUR DU STATUT PIPELINE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'pipeline_stage'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN pipeline_stage text DEFAULT 'nouveau_lead';
  END IF;
END $$;

-- ============================================================================
-- 2. S'ASSURER QUE LES 5 COMPAGNIES EXISTENT
-- ============================================================================

INSERT INTO insurance_companies (name, code, contact_email, contact_phone, description, is_active, is_mandatory)
VALUES
  ('Generali', 'generali', 'contact@generali.fr', '01 XX XX XX XX', 'Leader de l''assurance taxi', true, true),
  ('Plus Simple', 'plus-simple', 'contact@plussimple.fr', '01 XX XX XX XX', 'Assurance taxi simplifiée', true, true),
  ('2MA', '2ma', 'contact@2ma.fr', '01 XX XX XX XX', 'Mutuelle des artisans', true, true),
  ('Zéphyr', 'zephyr', 'contact@zephyr.fr', '01 XX XX XX XX', 'Assurance spécialisée taxis', true, true),
  ('Soliasur', 'soliasur', 'contact@soliasur.fr', '01 XX XX XX XX', 'Protection solidaire', true, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 3. TABLE : VALIDATIONS DE DEVIS PAR LES PROSPECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_quote_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES lead_company_quotes(id) ON DELETE CASCADE,
  insurance_company_id uuid NOT NULL REFERENCES insurance_companies(id),
  validated_at timestamptz DEFAULT now(),
  validation_ip inet,
  validation_user_agent text,
  prospect_comments text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_validations_lead ON lead_quote_validations(lead_id);
CREATE INDEX IF NOT EXISTS idx_quote_validations_quote ON lead_quote_validations(quote_id);

-- ============================================================================
-- 4. TABLE : UPLOAD ET VALIDATION DES RIB
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_rib_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  iban text,
  bic text,
  account_holder_name text,
  bank_name text,
  validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected')),
  validated_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  rejection_reason text,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rib_uploads_lead ON lead_rib_uploads(lead_id);
CREATE INDEX IF NOT EXISTS idx_rib_uploads_status ON lead_rib_uploads(validation_status);

-- ============================================================================
-- 5. TABLE : DOCUMENTS FINAUX DE CONTRAT
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_contract_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN (
    'contrat_signe',
    'attestation_assurance',
    'memo_vehicule'
  )),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now(),
  is_visible_to_client boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_documents_lead ON lead_contract_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_type ON lead_contract_documents(document_type);

-- ============================================================================
-- 6. TABLE : TEMPLATES DE COMMUNICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_communication_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  template_name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  stage text NOT NULL,
  subject text,
  body_text text NOT NULL,
  body_html text,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communication_templates_stage ON crm_communication_templates(stage);
CREATE INDEX IF NOT EXISTS idx_communication_templates_channel ON crm_communication_templates(channel);

-- ============================================================================
-- 7. TABLE : HISTORIQUE DES SIGNATURES
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_signature_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  signature_type text NOT NULL CHECK (signature_type IN ('devis', 'contrat')),
  signature_method text DEFAULT 'external',
  is_signed boolean DEFAULT false,
  signed_at timestamptz,
  signed_by_name text,
  confirmed_by uuid REFERENCES auth.users(id),
  confirmed_at timestamptz,
  external_signature_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signature_history_lead ON lead_signature_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_signature_history_type ON lead_signature_history(signature_type);

-- ============================================================================
-- 8. ENABLE RLS SUR TOUTES LES NOUVELLES TABLES
-- ============================================================================

ALTER TABLE lead_quote_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_rib_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_signature_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. RLS POLICIES - ACCÈS ADMIN
-- ============================================================================

CREATE POLICY "Admins can manage quote validations"
  ON lead_quote_validations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage RIB uploads"
  ON lead_rib_uploads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage contract documents"
  ON lead_contract_documents FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage communication templates"
  ON crm_communication_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage signature history"
  ON lead_signature_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 10. RLS POLICIES - ACCÈS PROSPECT VIA TOKEN
-- ============================================================================

CREATE POLICY "Prospects can validate quotes via token"
  ON lead_quote_validations FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE id = lead_id
      AND access_token IS NOT NULL
    )
  );

CREATE POLICY "Prospects can upload RIB via token"
  ON lead_rib_uploads FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE id = lead_id
      AND access_token IS NOT NULL
    )
  );

CREATE POLICY "Prospects can view contract documents via token"
  ON lead_contract_documents FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE id = lead_id
      AND access_token IS NOT NULL
    )
  );

-- ============================================================================
-- 11. STORAGE BUCKET POUR LES RIB
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-rib',
  'lead-rib',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload RIB"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lead-rib');

CREATE POLICY "Authenticated users can read RIB"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'lead-rib');

-- ============================================================================
-- 12. INSERTION DES TEMPLATES DE COMMUNICATION
-- ============================================================================

INSERT INTO crm_communication_templates (template_key, template_name, channel, stage, subject, body_text, variables) VALUES
('new_lead_email', 'Premier contact - Email', 'email', 'nouveau_lead',
 'Bienvenue chez TaxiAssur - Votre demande de devis',
 'Bonjour {{first_name}},

Nous avons bien reçu votre demande de devis pour votre assurance taxi.

Un de nos conseillers va vous contacter dans les 15 minutes pour comprendre vos besoins et vous accompagner.

À très bientôt !
L''équipe TaxiAssur',
 '["first_name", "last_name", "phone"]'::jsonb),

('new_lead_sms', 'Premier contact - SMS', 'sms', 'nouveau_lead',
 NULL,
 'Bonjour {{first_name}}, TaxiAssur vous remercie pour votre demande. Un conseiller vous appelle dans 15min.',
 '["first_name", "phone"]'::jsonb),

('documents_request_email', 'Demande de documents - Email', 'email', 'collecte_documents',
 'Documents nécessaires pour votre assurance taxi',
 'Bonjour {{first_name}},

Pour établir votre devis personnalisé, nous avons besoin des documents suivants :

- Licence de taxi
- Permis de conduire
- Carte grise du véhicule
- Relevé d''information
- RIB
- Carte professionnelle

Vous pouvez nous les envoyer :
- Par email en répondant à ce message
- Via votre espace prospect : {{prospect_space_url}}

Merci de votre confiance,
L''équipe TaxiAssur',
 '["first_name", "prospect_space_url"]'::jsonb),

('documents_request_whatsapp', 'Demande de documents - WhatsApp', 'whatsapp', 'collecte_documents',
 NULL,
 'Bonjour {{first_name}}

Pour votre devis d''assurance taxi, envoyez-nous vos documents :
- Licence taxi
- Permis de conduire
- Carte grise
- Relevé d''information
- RIB
- Carte pro

Répondez directement ici ou sur : {{prospect_space_url}}

Merci !',
 '["first_name", "prospect_space_url"]'::jsonb),

('quote_available_email', 'Nouveau devis disponible - Email', 'email', 'saisie_devis',
 'Votre devis {{company_name}} est disponible',
 'Bonjour {{first_name}},

Excellente nouvelle ! Votre devis d''assurance taxi avec {{company_name}} est maintenant disponible.

Consultez votre devis : {{prospect_space_url}}

Vous y trouverez :
- Le devis détaillé
- Les conditions générales
- Les documents légaux

Cordialement,
L''équipe TaxiAssur',
 '["first_name", "company_name", "prospect_space_url"]'::jsonb),

('quote_validated_confirmation', 'Confirmation validation devis', 'email', 'validation_devis_prospect',
 'Devis validé - Prochaines étapes',
 'Bonjour {{first_name}},

Nous avons bien reçu votre validation du devis {{company_name}}.

Prochaines étapes :
1. Signature électronique du devis
2. Envoi de votre RIB pour le prélèvement
3. Réception de votre contrat et attestation

Nous vous accompagnons à chaque étape !

L''équipe TaxiAssur',
 '["first_name", "company_name"]'::jsonb),

('rib_request_email', 'Demande de RIB', 'email', 'paiement_rib',
 'RIB nécessaire pour finaliser votre contrat',
 'Bonjour {{first_name}},

Pour finaliser votre contrat d''assurance, nous avons besoin de votre RIB pour mettre en place le prélèvement automatique.

Déposez votre RIB : {{prospect_space_url}}

Une fois validé, nous pourrons émettre votre contrat définitif.

Merci,
L''équipe TaxiAssur',
 '["first_name", "prospect_space_url"]'::jsonb),

('contract_ready_email', 'Votre contrat est prêt', 'email', 'contrat_signature',
 'Félicitations ! Votre contrat d''assurance est prêt',
 'Bonjour {{first_name}},

Félicitations ! Votre contrat d''assurance taxi est maintenant finalisé.

Vous trouverez dans votre espace client :
- Votre contrat signé
- Votre attestation d''assurance
- Le mémo de votre véhicule

Accédez à votre espace client : {{client_space_url}}

Bienvenue dans la famille TaxiAssur !

L''équipe TaxiAssur',
 '["first_name", "client_space_url"]'::jsonb)

ON CONFLICT (template_key) DO UPDATE SET
  body_text = EXCLUDED.body_text,
  updated_at = now();