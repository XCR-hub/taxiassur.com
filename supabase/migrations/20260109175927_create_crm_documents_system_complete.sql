/*
  # Système Complet de Documents CRM

  1. Nouvelles Tables
    - `crm_lead_documents` - Documents uploadés pour chaque lead
      - Types : Carte Grise, Permis, Licence Taxi, Carte Identité, RIB, Contrat Signé, Autre
      - Stockage Supabase Storage
      - Statut : En attente, Validé, Refusé
    
    - `crm_document_notifications` - Historique des notifications envoyées
      - Quand un document est uploadé
      - Quels emails ont été envoyés automatiquement
    
    - `crm_review_requests` - Demandes d'avis Google
      - Tracking des demandes envoyées
      - Statut : Envoyé, Cliqué, Avis donné

  2. Sécurité
    - RLS activé sur toutes les tables
    - Accès admin uniquement

  3. Storage Bucket
    - Bucket "crm-documents" pour stocker les fichiers
    - RLS sur le bucket
*/

-- Table des documents leads
CREATE TABLE IF NOT EXISTS crm_lead_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN (
    'carte_grise',
    'permis_conduire',
    'licence_taxi',
    'carte_identite',
    'rib',
    'contrat_signe',
    'autorisation_stationnement',
    'autre'
  )),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  uploaded_by text,
  uploaded_at timestamptz DEFAULT now(),
  validated_by text,
  validated_at timestamptz,
  rejection_reason text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_lead_id ON crm_lead_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_type ON crm_lead_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_status ON crm_lead_documents(status);

-- Table notifications documents
CREATE TABLE IF NOT EXISTS crm_document_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  document_id uuid REFERENCES crm_lead_documents(id) ON DELETE SET NULL,
  notification_type text NOT NULL CHECK (notification_type IN (
    'document_uploaded',
    'document_validated',
    'document_rejected',
    'contract_ready',
    'all_documents_complete'
  )),
  sent_to text NOT NULL,
  sent_via text CHECK (sent_via IN ('email', 'sms', 'whatsapp')),
  subject text,
  body text,
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'failed')),
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_document_notifications_lead_id ON crm_document_notifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_document_notifications_type ON crm_document_notifications(notification_type);

-- Table demandes avis Google
CREATE TABLE IF NOT EXISTS crm_review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  request_type text DEFAULT 'google' CHECK (request_type IN ('google', 'trustpilot', 'other')),
  sent_to text NOT NULL,
  sent_via text CHECK (sent_via IN ('email', 'sms', 'whatsapp')),
  review_url text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  clicked_at timestamptz,
  review_given_at timestamptz,
  review_rating integer CHECK (review_rating >= 1 AND review_rating <= 5),
  review_text text,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'clicked', 'review_given', 'expired')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_review_requests_lead_id ON crm_review_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_review_requests_status ON crm_review_requests(status);

-- Créer le bucket Storage s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-documents',
  'crm-documents',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS sur les tables
ALTER TABLE crm_lead_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_document_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_review_requests ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Admin uniquement (authentifié)
CREATE POLICY "Admin full access crm_lead_documents"
  ON crm_lead_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin full access crm_document_notifications"
  ON crm_document_notifications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin full access crm_review_requests"
  ON crm_review_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS sur le bucket Storage
CREATE POLICY "Admin can upload crm documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'crm-documents');

CREATE POLICY "Admin can read crm documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'crm-documents');

CREATE POLICY "Admin can delete crm documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'crm-documents');

-- Fonction pour notifier automatiquement quand un document est uploadé
CREATE OR REPLACE FUNCTION notify_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer une notification automatique
  INSERT INTO crm_document_notifications (
    lead_id,
    document_id,
    notification_type,
    sent_to,
    sent_via,
    subject,
    body,
    status
  )
  SELECT
    NEW.lead_id,
    NEW.id,
    'document_uploaded',
    l.email,
    'email',
    'Document reçu - TaxiAssur',
    'Nous avons bien reçu votre document (' || NEW.document_type || '). Notre équipe va le vérifier dans les plus brefs délais.',
    'pending'
  FROM crm_leads l
  WHERE l.id = NEW.lead_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur upload document
DROP TRIGGER IF EXISTS trigger_notify_document_upload ON crm_lead_documents;
CREATE TRIGGER trigger_notify_document_upload
  AFTER INSERT ON crm_lead_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_upload();

-- Fonction pour vérifier si tous les documents sont complets
CREATE OR REPLACE FUNCTION check_documents_complete()
RETURNS TRIGGER AS $$
DECLARE
  required_docs text[] := ARRAY['carte_grise', 'permis_conduire', 'licence_taxi', 'rib'];
  missing_docs integer;
BEGIN
  -- Compter les documents manquants
  SELECT COUNT(*)
  INTO missing_docs
  FROM unnest(required_docs) AS doc_type
  WHERE NOT EXISTS (
    SELECT 1
    FROM crm_lead_documents
    WHERE lead_id = NEW.lead_id
      AND document_type = doc_type
      AND status = 'validated'
  );

  -- Si tous les docs sont là, envoyer notification
  IF missing_docs = 0 THEN
    INSERT INTO crm_document_notifications (
      lead_id,
      notification_type,
      sent_to,
      sent_via,
      subject,
      body,
      status
    )
    SELECT
      NEW.lead_id,
      'all_documents_complete',
      l.email,
      'email',
      'Dossier complet - TaxiAssur',
      'Félicitations ! Tous vos documents ont été validés. Nous préparons votre contrat.',
      'pending'
    FROM crm_leads l
    WHERE l.id = NEW.lead_id;

    -- Mettre à jour le statut du lead
    UPDATE crm_leads
    SET 
      status = 'documents_validated',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{documents_complete_at}',
        to_jsonb(now())
      )
    WHERE id = NEW.lead_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur validation document
DROP TRIGGER IF EXISTS trigger_check_documents_complete ON crm_lead_documents;
CREATE TRIGGER trigger_check_documents_complete
  AFTER UPDATE OF status ON crm_lead_documents
  FOR EACH ROW
  WHEN (NEW.status = 'validated' AND OLD.status != 'validated')
  EXECUTE FUNCTION check_documents_complete();
