/*
  # Industrialisation CRM - Documents Compagnies v3
*/

-- ================================================================
-- 1. ENRICHIR company_documents
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_documents' AND column_name = 'category') THEN
    ALTER TABLE company_documents ADD COLUMN category text DEFAULT 'general';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_documents' AND column_name = 'version') THEN
    ALTER TABLE company_documents ADD COLUMN version text DEFAULT '1.0';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_documents' AND column_name = 'valid_from') THEN
    ALTER TABLE company_documents ADD COLUMN valid_from date DEFAULT CURRENT_DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_documents' AND column_name = 'valid_until') THEN
    ALTER TABLE company_documents ADD COLUMN valid_until date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_documents' AND column_name = 'display_order') THEN
    ALTER TABLE company_documents ADD COLUMN display_order integer DEFAULT 0;
  END IF;
END $$;

-- ================================================================
-- 2. TABLE: Types de documents requis pour les prospects
-- ================================================================

CREATE TABLE IF NOT EXISTS required_prospect_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_mandatory boolean DEFAULT true,
  display_order integer DEFAULT 0,
  accepted_formats text[] DEFAULT ARRAY['pdf', 'jpg', 'jpeg', 'png'],
  max_size_mb integer DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO required_prospect_documents (document_type, display_name, description, is_mandatory, display_order) VALUES
  ('carte_grise', 'Carte grise du véhicule', 'Certificat d''immatriculation du véhicule taxi', true, 1),
  ('permis_conduire', 'Permis de conduire', 'Permis de conduire en cours de validité (recto/verso)', true, 2),
  ('licence_taxi', 'Licence taxi / ADS', 'Autorisation de Stationnement (ADS) ou licence taxi', true, 3),
  ('piece_identite', 'Pièce d''identité', 'CNI ou Passeport (recto/verso)', true, 4),
  ('rib', 'RIB', 'Relevé d''Identité Bancaire pour les prélèvements', true, 5),
  ('releve_information', 'Relevé d''information', 'Relevé d''information de votre précédent assureur', false, 6),
  ('kbis', 'Kbis / SIRET', 'Extrait Kbis ou attestation SIRET pour les sociétés', false, 7),
  ('autorisation_stationnement', 'Autorisation de stationnement', 'Document officiel d''autorisation de stationnement', false, 8)
ON CONFLICT (document_type) DO NOTHING;

-- ================================================================
-- 3. Types de documents compagnies (FIXES)
-- ================================================================

CREATE TABLE IF NOT EXISTS company_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  send_with_quote boolean DEFAULT false,
  send_with_contract boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true
);

INSERT INTO company_document_types (type_code, display_name, send_with_quote, send_with_contract, display_order) VALUES
  ('dispositions_generales', 'Dispositions Générales', true, true, 1),
  ('ipid', 'Document IPID (Information Produit)', true, true, 2),
  ('fiche_conseil', 'Fiche de Conseil', true, false, 3),
  ('annexe_rc_pro', 'Annexe RC Professionnelle', true, true, 4),
  ('convention_assistance', 'Convention d''Assistance', true, true, 5),
  ('notice_information', 'Notice d''Information', true, false, 6),
  ('conditions_particulieres_type', 'Conditions Particulières Type', false, true, 7),
  ('mandat_prelevement', 'Mandat de Prélèvement', false, true, 8)
ON CONFLICT (type_code) DO NOTHING;

-- ================================================================
-- 4. FONCTIONS documents compagnie
-- ================================================================

DROP FUNCTION IF EXISTS get_company_documents_for_quote(uuid);
CREATE FUNCTION get_company_documents_for_quote(p_company_id uuid)
RETURNS TABLE (
  id uuid,
  document_name text,
  document_type text,
  file_url text,
  category text,
  display_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cd.id,
    cd.document_name,
    cd.document_type,
    cd.file_url,
    cd.category,
    cd.display_order
  FROM company_documents cd
  WHERE cd.company_id = p_company_id
  AND cd.send_with_quote = true
  AND (cd.valid_until IS NULL OR cd.valid_until >= CURRENT_DATE)
  ORDER BY cd.display_order, cd.document_name;
END;
$$;

DROP FUNCTION IF EXISTS get_company_documents_for_contract(uuid);
CREATE FUNCTION get_company_documents_for_contract(p_company_id uuid)
RETURNS TABLE (
  id uuid,
  document_name text,
  document_type text,
  file_url text,
  category text,
  display_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cd.id,
    cd.document_name,
    cd.document_type,
    cd.file_url,
    cd.category,
    cd.display_order
  FROM company_documents cd
  WHERE cd.company_id = p_company_id
  AND cd.send_with_contract = true
  AND (cd.valid_until IS NULL OR cd.valid_until >= CURRENT_DATE)
  ORDER BY cd.display_order, cd.document_name;
END;
$$;

-- ================================================================
-- 5. VUE: Documents requis avec statut par lead
-- ================================================================

DROP VIEW IF EXISTS v_lead_documents_status;
CREATE VIEW v_lead_documents_status AS
SELECT 
  l.id as lead_id,
  l.first_name,
  l.last_name,
  l.email,
  rpd.document_type,
  rpd.display_name,
  rpd.is_mandatory,
  CASE 
    WHEN pd.id IS NOT NULL AND pd.status = 'approved' THEN 'received'
    WHEN pd.id IS NOT NULL AND pd.status = 'pending' THEN 'pending_review'
    WHEN pd.id IS NOT NULL AND pd.status = 'rejected' THEN 'rejected'
    ELSE 'missing'
  END as doc_status,
  pd.file_path,
  pd.uploaded_at
FROM crm_leads l
CROSS JOIN required_prospect_documents rpd
LEFT JOIN prospect_documents pd ON pd.lead_id = l.id AND pd.document_type = rpd.document_type
WHERE rpd.is_active = true
AND l.deleted_at IS NULL;

-- ================================================================
-- 6. FONCTION: Vérifier si tous les documents obligatoires sont reçus
-- ================================================================

DROP FUNCTION IF EXISTS check_lead_documents_complete(uuid);
CREATE FUNCTION check_lead_documents_complete(p_lead_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_required_count integer;
  v_received_count integer;
BEGIN
  SELECT COUNT(*) INTO v_required_count
  FROM required_prospect_documents
  WHERE is_mandatory = true AND is_active = true;
  
  SELECT COUNT(DISTINCT pd.document_type) INTO v_received_count
  FROM prospect_documents pd
  JOIN required_prospect_documents rpd ON rpd.document_type = pd.document_type
  WHERE pd.lead_id = p_lead_id
  AND pd.status IN ('approved', 'pending')
  AND rpd.is_mandatory = true;
  
  RETURN v_received_count >= v_required_count;
END;
$$;

-- ================================================================
-- 7. TRIGGER: Vérification automatique documents complets
-- ================================================================

CREATE OR REPLACE FUNCTION on_prospect_document_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_complete boolean;
BEGIN
  PERFORM create_automation_event(
    NEW.lead_id,
    'document_uploaded',
    jsonb_build_object(
      'document_type', NEW.document_type,
      'file_name', NEW.file_name,
      'status', NEW.status
    ),
    NULL,
    NULL
  );
  
  PERFORM queue_event_notifications(NEW.lead_id, 'document_uploaded', jsonb_build_object(
    'document_type', NEW.document_type
  ));
  
  v_is_complete := check_lead_documents_complete(NEW.lead_id);
  
  IF v_is_complete THEN
    UPDATE crm_leads 
    SET 
      documents_complete = true,
      documents_received_at = COALESCE(documents_received_at, now())
    WHERE id = NEW.lead_id
    AND documents_complete = false;
    
    IF FOUND THEN
      PERFORM create_automation_event(
        NEW.lead_id,
        'documents_complete',
        jsonb_build_object('completed_at', now()),
        NULL,
        NULL
      );
      
      PERFORM queue_event_notifications(NEW.lead_id, 'documents_complete', '{}'::jsonb);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prospect_document_change ON prospect_documents;
CREATE TRIGGER trg_prospect_document_change
  AFTER INSERT OR UPDATE ON prospect_documents
  FOR EACH ROW
  EXECUTE FUNCTION on_prospect_document_change();

-- ================================================================
-- 8. TABLE: Templates de notification
-- ================================================================

CREATE TABLE IF NOT EXISTS crm_notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text UNIQUE NOT NULL,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'push', 'internal')),
  subject text,
  content text NOT NULL,
  html_content text,
  variables jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO crm_notification_templates (template_id, name, channel, subject, content) VALUES
  ('welcome_lead', 'Email de bienvenue lead', 'email', 
   'Bienvenue chez TaxiAssur - Votre demande de devis', 
   'Bonjour {{first_name}},

Merci d''avoir choisi TaxiAssur pour votre assurance taxi !

Pour accélérer le traitement de votre demande, déposez vos documents ici :
{{upload_link}}

Documents requis :
- Carte grise du véhicule
- Permis de conduire
- Licence taxi / ADS
- Pièce d''identité
- RIB

Cordialement,
L''équipe TaxiAssur
01 76 39 00 60'),
  ('new_lead_alert', 'Alerte nouveau lead équipe', 'email',
   '[TaxiAssur] Nouveau lead : {{first_name}} {{last_name}}',
   'Nouveau lead reçu :
Nom: {{first_name}} {{last_name}}
Email: {{email}}
Téléphone: {{phone}}
Source: {{source}}'),
  ('document_received', 'Document reçu confirmation', 'email',
   'Document bien reçu - TaxiAssur',
   'Bonjour {{first_name}},

Nous avons bien reçu votre document ({{document_type}}).

Cordialement,
L''équipe TaxiAssur'),
  ('documents_complete', 'Dossier complet', 'email',
   'Votre dossier est complet - TaxiAssur',
   'Bonjour {{first_name}},

Bonne nouvelle ! Tous vos documents ont été reçus.
Nous préparons votre devis personnalisé.

Cordialement,
L''équipe TaxiAssur'),
  ('quote_available', 'Devis disponible', 'email',
   'Votre devis d''assurance taxi est prêt - TaxiAssur',
   'Bonjour {{first_name}},

Votre devis personnalisé est disponible !

Consultez-le dans votre espace : {{upload_link}}

Cordialement,
L''équipe TaxiAssur'),
  ('quote_sms', 'Devis dispo SMS', 'sms', NULL,
   'TaxiAssur: Votre devis est prêt ! Consultez-le ici: {{upload_link}}'),
  ('signature_ready', 'Contrat à signer', 'email',
   'Votre contrat est prêt à être signé - TaxiAssur',
   'Bonjour {{first_name}},

Votre contrat d''assurance taxi est prêt.

Signez-le en ligne : {{signature_url}}

Cordialement,
L''équipe TaxiAssur'),
  ('payment_confirmation', 'Confirmation paiement', 'email',
   'Paiement confirmé - Bienvenue chez TaxiAssur !',
   'Bonjour {{first_name}},

Nous confirmons la réception de votre paiement.

Vous êtes maintenant assuré chez TaxiAssur !

Votre attestation sera disponible sous 24h dans votre espace client.

Cordialement,
L''équipe TaxiAssur'),
  ('welcome_client', 'Bienvenue client', 'email',
   'Bienvenue dans votre espace client TaxiAssur',
   'Bonjour {{first_name}},

Félicitations ! Vous êtes maintenant client TaxiAssur.

Accédez à votre espace client : {{upload_link}}

Vous pouvez y :
- Télécharger vos documents
- Déclarer un sinistre
- Modifier vos informations

Cordialement,
L''équipe TaxiAssur')
ON CONFLICT (template_id) DO NOTHING;

ALTER TABLE crm_notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_notification_templates_admin_all" ON crm_notification_templates;
CREATE POLICY "crm_notification_templates_admin_all" ON crm_notification_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
