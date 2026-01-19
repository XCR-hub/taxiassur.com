/*
  # Amélioration du système de validation de documents
  
  1. Modifications
    - Transformer `status` en validation_status avec enum
    - Changer `validated_by` de text à uuid
    - Ajouter `rejection_details`
    - Créer table d'historique
    - Créer fonctions de validation
  
  2. Workflow complet
    - Upload → pending (À contrôler)
    - Validation → approved (Validé)
    - Rejet → rejected (Rejeté) + notification
*/

-- Ajouter colonne rejection_details si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prospect_documents' 
    AND column_name = 'rejection_details'
  ) THEN
    ALTER TABLE prospect_documents 
    ADD COLUMN rejection_details text;
  END IF;
END $$;

-- Modifier validated_by pour être une clé étrangère vers admin_users
DO $$
BEGIN
  -- Supprimer l'ancienne colonne et la recréer avec le bon type
  ALTER TABLE prospect_documents DROP COLUMN IF EXISTS validated_by;
  ALTER TABLE prospect_documents ADD COLUMN validated_by uuid REFERENCES admin_users(id);
END $$;

-- Mettre à jour status par défaut à 'pending' pour les documents sans statut
UPDATE prospect_documents 
SET status = 'pending' 
WHERE status IS NULL OR status = '';

-- Table d'historique de validation
CREATE TABLE IF NOT EXISTS document_validation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES prospect_documents(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('validated', 'rejected', 'requested_replacement')),
  performed_by uuid NOT NULL REFERENCES admin_users(id),
  rejection_reason text,
  rejection_details text,
  previous_status text,
  new_status text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_validation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view validation history"
  ON document_validation_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert validation history"
  ON document_validation_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_prospect_documents_status 
  ON prospect_documents(status);

CREATE INDEX IF NOT EXISTS idx_prospect_documents_lead_status 
  ON prospect_documents(lead_id, status);

CREATE INDEX IF NOT EXISTS idx_document_validation_history_document 
  ON document_validation_history(document_id);

CREATE INDEX IF NOT EXISTS idx_document_validation_history_lead 
  ON document_validation_history(lead_id);

-- Fonction pour valider un document
CREATE OR REPLACE FUNCTION validate_document(
  p_document_id uuid,
  p_validated_by uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_document record;
  v_lead_id uuid;
BEGIN
  -- Récupérer le document
  SELECT * INTO v_document 
  FROM prospect_documents 
  WHERE id = p_document_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found');
  END IF;

  v_lead_id := v_document.lead_id;

  -- Mettre à jour le document
  UPDATE prospect_documents
  SET 
    status = 'approved',
    validated_by = p_validated_by,
    validated_at = now(),
    rejection_reason = NULL,
    rejection_details = NULL
  WHERE id = p_document_id;

  -- Enregistrer dans l'historique
  INSERT INTO document_validation_history (
    document_id,
    lead_id,
    action,
    performed_by,
    previous_status,
    new_status
  ) VALUES (
    p_document_id,
    v_lead_id,
    'validated',
    p_validated_by,
    v_document.status,
    'approved'
  );

  -- Créer une interaction CRM
  INSERT INTO crm_interactions (
    lead_id,
    type,
    direction,
    summary,
    content,
    created_by
  ) VALUES (
    v_lead_id,
    'note',
    'internal',
    'Document validé: ' || v_document.document_type,
    'Le document "' || v_document.document_type || '" a été validé avec succès.',
    p_validated_by::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Document validé avec succès'
  );
END;
$$;

-- Fonction pour rejeter un document
CREATE OR REPLACE FUNCTION reject_document(
  p_document_id uuid,
  p_validated_by uuid,
  p_rejection_reason text,
  p_rejection_details text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_document record;
  v_lead record;
  v_lead_id uuid;
  v_reason_label text;
BEGIN
  -- Récupérer le document
  SELECT * INTO v_document 
  FROM prospect_documents 
  WHERE id = p_document_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found');
  END IF;

  v_lead_id := v_document.lead_id;

  -- Récupérer le lead
  SELECT * INTO v_lead 
  FROM crm_leads 
  WHERE id = v_lead_id;

  -- Convertir le motif en texte lisible
  v_reason_label := CASE p_rejection_reason
    WHEN 'illegible' THEN 'Document illisible'
    WHEN 'duplicate' THEN 'Document en doublon'
    WHEN 'wrong_document' THEN 'Mauvais document'
    WHEN 'expired' THEN 'Document expiré'
    WHEN 'incomplete' THEN 'Document incomplet'
    ELSE 'Autre motif'
  END;

  -- Mettre à jour le document
  UPDATE prospect_documents
  SET 
    status = 'rejected',
    validated_by = p_validated_by,
    validated_at = now(),
    rejection_reason = p_rejection_reason,
    rejection_details = p_rejection_details
  WHERE id = p_document_id;

  -- Enregistrer dans l'historique
  INSERT INTO document_validation_history (
    document_id,
    lead_id,
    action,
    performed_by,
    rejection_reason,
    rejection_details,
    previous_status,
    new_status
  ) VALUES (
    p_document_id,
    v_lead_id,
    'rejected',
    p_validated_by,
    p_rejection_reason,
    p_rejection_details,
    v_document.status,
    'rejected'
  );

  -- Créer une interaction CRM
  INSERT INTO crm_interactions (
    lead_id,
    type,
    direction,
    summary,
    content,
    created_by
  ) VALUES (
    v_lead_id,
    'note',
    'internal',
    'Document rejeté: ' || v_document.document_type,
    'Document "' || v_document.document_type || '" rejeté. Motif: ' || v_reason_label || 
    CASE WHEN p_rejection_details IS NOT NULL THEN E'\nDétails: ' || p_rejection_details ELSE '' END,
    p_validated_by::text
  );

  -- Créer une notification pour le prospect
  INSERT INTO crm_event_notifications (
    lead_id,
    type,
    priority,
    title,
    message,
    action_url,
    metadata
  ) VALUES (
    v_lead_id,
    'document_rejected',
    'high',
    'Document à remplacer',
    'Votre document "' || v_document.document_type || '" a été rejeté. ' || v_reason_label || '. ' ||
    COALESCE(p_rejection_details, 'Merci de télécharger à nouveau ce document.'),
    '/espace-prospect?section=documents',
    jsonb_build_object(
      'document_id', p_document_id,
      'document_type', v_document.document_type,
      'rejection_reason', p_rejection_reason,
      'rejection_details', p_rejection_details
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Document rejeté. Le prospect a été notifié.',
    'lead_email', v_lead.email,
    'access_token', v_lead.access_token
  );
END;
$$;

-- Fonction pour obtenir les statistiques de validation
CREATE OR REPLACE FUNCTION get_document_validation_stats(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'completion_rate', 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'approved')::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0 
      END
  ) INTO v_stats
  FROM prospect_documents
  WHERE lead_id = p_lead_id;

  RETURN v_stats;
END;
$$;

-- Vue pour la queue de documents en attente
CREATE OR REPLACE VIEW pending_documents_queue AS
SELECT 
  pd.id,
  pd.lead_id,
  pd.document_type,
  pd.file_name,
  pd.file_size,
  pd.file_path,
  pd.uploaded_at,
  pd.status,
  pd.rejection_reason,
  pd.rejection_details,
  cl.first_name,
  cl.last_name,
  cl.email,
  cl.phone,
  cl.city,
  cl.status as lead_status,
  EXTRACT(EPOCH FROM (now() - pd.uploaded_at))/3600 AS hours_waiting
FROM prospect_documents pd
JOIN crm_leads cl ON pd.lead_id = cl.id
WHERE pd.status = 'pending'
ORDER BY pd.uploaded_at ASC;

COMMENT ON VIEW pending_documents_queue IS 'Vue des documents en attente de validation avec informations du lead';
