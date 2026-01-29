/*
  # Création automatique d'interactions dans la timeline
  
  1. Crée des triggers pour enregistrer automatiquement les interactions
  2. Enregistre les actions importantes (statut, documents, etc.)
  3. Crée des interactions de test pour les leads existants
*/

-- ============================================
-- Fonction : Enregistrer interaction automatique
-- ============================================

CREATE OR REPLACE FUNCTION record_timeline_interaction(
  p_lead_id uuid,
  p_channel text,
  p_direction text,
  p_subject text,
  p_content text DEFAULT NULL,
  p_summary text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_interaction_id uuid;
BEGIN
  INSERT INTO crm_interactions (
    lead_id,
    type,
    channel,
    direction,
    subject,
    content,
    summary,
    created_at,
    created_by
  ) VALUES (
    p_lead_id,
    p_channel,  -- type
    p_channel,  -- channel
    p_direction,
    p_subject,
    p_content,
    p_summary,
    now(),
    auth.uid()
  )
  RETURNING id INTO v_interaction_id;
  
  RETURN v_interaction_id;
END;
$$;

-- ============================================
-- Trigger : Changement de statut lead
-- ============================================

CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Seulement si le statut a changé
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM record_timeline_interaction(
      NEW.id,
      'system',
      'outbound',
      'Changement de statut',
      'Statut modifié : ' || COALESCE(OLD.status, 'non défini') || ' → ' || NEW.status,
      'Changement automatique dans le CRM'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_lead_status_change ON crm_leads;
CREATE TRIGGER trigger_log_lead_status_change
  AFTER UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_status_change();

-- ============================================
-- Trigger : Validation de document
-- ============================================

CREATE OR REPLACE FUNCTION log_document_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Seulement si le document passe à validé
  IF (TG_OP = 'UPDATE' AND OLD.validated = false AND NEW.validated = true) THEN
    PERFORM record_timeline_interaction(
      NEW.lead_id,
      'document',
      'outbound',
      'Document validé',
      'Document "' || NEW.file_name || '" validé',
      'Type: ' || COALESCE(NEW.document_type, 'non spécifié')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_document_validation ON prospect_documents;
CREATE TRIGGER trigger_log_document_validation
  AFTER UPDATE ON prospect_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_validation();

-- ============================================
-- Trigger : Upload nouveau document
-- ============================================

CREATE OR REPLACE FUNCTION log_document_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM record_timeline_interaction(
      NEW.lead_id,
      'document',
      'inbound',
      'Nouveau document reçu',
      'Document "' || NEW.file_name || '" uploadé',
      'Type: ' || COALESCE(NEW.document_type, 'à classer')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_document_upload ON prospect_documents;
CREATE TRIGGER trigger_log_document_upload
  AFTER INSERT ON prospect_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_upload();

-- ============================================
-- Créer des interactions de test pour leads existants
-- ============================================

-- Pour chaque lead, créer une interaction initiale
INSERT INTO crm_interactions (
  lead_id,
  type,
  channel,
  direction,
  subject,
  content,
  summary,
  created_at,
  created_by
)
SELECT 
  id,
  'system',
  'system',
  'inbound',
  'Lead créé',
  'Nouvelle demande de devis reçue via le formulaire',
  'Email: ' || email || E'\nTéléphone: ' || COALESCE(phone, 'non renseigné'),
  created_at,
  NULL
FROM crm_leads
WHERE NOT EXISTS (
  SELECT 1 FROM crm_interactions 
  WHERE crm_interactions.lead_id = crm_leads.id
)
AND created_at > '2026-01-01'  -- Seulement les leads récents
LIMIT 50;
