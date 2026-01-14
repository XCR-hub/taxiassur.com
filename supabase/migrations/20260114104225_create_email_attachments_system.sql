/*
  # Système de Gestion des Pièces Jointes Email - Attente de Classification

  1. Nouvelles Tables
    - `email_attachments`
      - Stockage de toutes les pièces jointes reçues par email
      - Classification automatique ou manuelle
      - Lien vers le lead et l'email source

    - `attachment_classifications`
      - Historique des classifications
      - Actions commerciales sur les pièces jointes

  2. Fonctionnalités
    - Extraction automatique des pièces jointes des emails
    - Mise en attente de classification par le commercial
    - Interface de drag & drop pour classifier
    - Historique complet des actions

  3. Sécurité
    - RLS activé sur toutes les tables
    - Accès restreint aux utilisateurs authentifiés
*/

-- Table pour stocker les pièces jointes des emails
CREATE TABLE IF NOT EXISTS email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Références
  email_message_id uuid REFERENCES email_messages(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,

  -- Informations du fichier
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  mime_type text,

  -- Stockage
  storage_path text,
  storage_bucket text DEFAULT 'attachments',
  download_url text,

  -- Classification
  classification_status text DEFAULT 'pending' CHECK (classification_status IN (
    'pending',
    'classified',
    'ignored',
    'duplicate',
    'invalid'
  )),

  document_type text,

  -- Détection automatique
  auto_detected_type text,
  confidence_score numeric(5,2),

  -- Actions commerciales
  classified_by uuid REFERENCES admin_users(id),
  classified_at timestamptz,

  ignored_by uuid REFERENCES admin_users(id),
  ignored_at timestamptz,
  ignored_reason text,

  -- Métadonnées
  extracted_text text,
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_email ON email_attachments(email_message_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_lead ON email_attachments(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_status ON email_attachments(classification_status);
CREATE INDEX IF NOT EXISTS idx_email_attachments_type ON email_attachments(document_type);
CREATE INDEX IF NOT EXISTS idx_email_attachments_pending ON email_attachments(lead_id, classification_status) WHERE classification_status = 'pending';

-- Table pour l'historique de classification
CREATE TABLE IF NOT EXISTS attachment_classification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id uuid REFERENCES email_attachments(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('classified', 'reclassified', 'ignored', 'unignored', 'marked_duplicate', 'marked_invalid')),
  previous_status text,
  new_status text,
  previous_document_type text,
  new_document_type text,
  action_by uuid REFERENCES admin_users(id),
  action_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachment_history_attachment ON attachment_classification_history(attachment_id);
CREATE INDEX IF NOT EXISTS idx_attachment_history_action ON attachment_classification_history(action);

ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachment_classification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view attachments"
  ON email_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert attachments"
  ON email_attachments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update attachments"
  ON email_attachments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view classification history"
  ON attachment_classification_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert classification history"
  ON attachment_classification_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_email_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_attachments_updated_at
  BEFORE UPDATE ON email_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_email_attachments_updated_at();

CREATE OR REPLACE FUNCTION create_attachment_classification_history()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.classification_status IS DISTINCT FROM NEW.classification_status) OR
     (OLD.document_type IS DISTINCT FROM NEW.document_type) THEN
    INSERT INTO attachment_classification_history (
      attachment_id, action, previous_status, new_status,
      previous_document_type, new_document_type, action_by
    ) VALUES (
      NEW.id,
      CASE
        WHEN NEW.classification_status = 'classified' THEN 'classified'
        WHEN NEW.classification_status = 'ignored' THEN 'ignored'
        WHEN NEW.classification_status = 'duplicate' THEN 'marked_duplicate'
        WHEN NEW.classification_status = 'invalid' THEN 'marked_invalid'
        ELSE 'reclassified'
      END,
      OLD.classification_status, NEW.classification_status,
      OLD.document_type, NEW.document_type, NEW.classified_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attachment_classification_history_trigger
  AFTER UPDATE ON email_attachments
  FOR EACH ROW
  EXECUTE FUNCTION create_attachment_classification_history();

CREATE OR REPLACE FUNCTION get_pending_attachments(p_lead_id uuid)
RETURNS TABLE (
  id uuid, file_name text, file_type text, file_size bigint,
  download_url text, auto_detected_type text, confidence_score numeric,
  created_at timestamptz, email_subject text, email_from text
) AS $$
BEGIN
  RETURN QUERY
  SELECT ea.id, ea.file_name, ea.file_type, ea.file_size, ea.download_url,
    ea.auto_detected_type, ea.confidence_score, ea.created_at,
    em.subject as email_subject, em.from_email as email_from
  FROM email_attachments ea
  LEFT JOIN email_messages em ON ea.email_message_id = em.id
  WHERE ea.lead_id = p_lead_id AND ea.classification_status = 'pending'
  ORDER BY ea.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION classify_attachment(
  p_attachment_id uuid, p_document_type text, p_classified_by uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_lead_id uuid;
  v_result jsonb;
BEGIN
  UPDATE email_attachments
  SET classification_status = 'classified', document_type = p_document_type,
      classified_by = COALESCE(p_classified_by, auth.uid()), classified_at = now()
  WHERE id = p_attachment_id
  RETURNING lead_id INTO v_lead_id;

  INSERT INTO prospect_documents (lead_id, document_type, file_name, file_path, file_size, status, source)
  SELECT lead_id, p_document_type, file_name, storage_path, file_size, 'uploaded', 'email_attachment'
  FROM email_attachments WHERE id = p_attachment_id;

  UPDATE crm_leads
  SET document_checklist = jsonb_set(
    COALESCE(document_checklist, '{}'::jsonb), ARRAY[p_document_type],
    jsonb_build_object('status', 'uploaded', 'validated', false, 'uploaded_at', now())
  ) WHERE id = v_lead_id;

  v_result = jsonb_build_object('success', true, 'attachment_id', p_attachment_id,
    'document_type', p_document_type, 'lead_id', v_lead_id);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION ignore_attachment(
  p_attachment_id uuid, p_reason text DEFAULT NULL, p_ignored_by uuid DEFAULT NULL
) RETURNS jsonb AS $$
BEGIN
  UPDATE email_attachments
  SET classification_status = 'ignored', ignored_by = COALESCE(p_ignored_by, auth.uid()),
      ignored_at = now(), ignored_reason = p_reason
  WHERE id = p_attachment_id;
  RETURN jsonb_build_object('success', true, 'attachment_id', p_attachment_id, 'reason', p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;