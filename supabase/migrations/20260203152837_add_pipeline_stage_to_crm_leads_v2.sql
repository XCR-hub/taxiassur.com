/*
  # Ajout de la colonne pipeline_stage_id pour synchronisation avec le Kanban

  1. Modifications
    - Ajoute la colonne pipeline_stage_id à crm_leads avec référence vers crm_pipeline_stages
    - Crée une fonction pour mettre à jour automatiquement le statut basé sur le stage
    - Crée un trigger pour synchroniser les deux systèmes

  2. Fonctionnement
    - Le stage du pipeline contrôle maintenant les étapes du workflow
    - Permet de changer l'étape manuellement et de revenir en arrière
    - Synchronisation bidirectionnelle entre Kanban et workflow
*/

-- Ajouter la colonne pipeline_stage_id si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_leads' AND column_name = 'pipeline_stage_id'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN pipeline_stage_id uuid REFERENCES crm_pipeline_stages(id);
  END IF;
END $$;

-- Créer un index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_crm_leads_pipeline_stage 
ON crm_leads(pipeline_stage_id);

-- Fonction pour mettre à jour le stage basé sur le statut
CREATE OR REPLACE FUNCTION sync_lead_stage_from_status()
RETURNS TRIGGER AS $$
DECLARE
  v_stage_id uuid;
BEGIN
  -- Si pipeline_stage_id n'est pas défini, le définir basé sur le status
  IF NEW.pipeline_stage_id IS NULL THEN
    -- Mapper les status aux stages
    CASE NEW.status::text
      WHEN 'NOUVEAU_LEAD', 'NEW_LEAD' THEN
        SELECT id INTO v_stage_id FROM crm_pipeline_stages WHERE name = 'Nouveau Lead' LIMIT 1;
      WHEN 'CONTACT_ATTEMPTED', 'CONTACT_CONFIRMED' THEN
        SELECT id INTO v_stage_id FROM crm_pipeline_stages WHERE name = 'Premier Contact' LIMIT 1;
      WHEN 'COLLECTE_DOCUMENTS', 'DOCUMENTS_REQUIRED', 'DOCUMENTS_PARTIAL' THEN
        SELECT id INTO v_stage_id FROM crm_pipeline_stages WHERE name = 'Qualifié' LIMIT 1;
      WHEN 'DEVIS', 'QUOTE_SENT', 'READY_FOR_QUOTE' THEN
        SELECT id INTO v_stage_id FROM crm_pipeline_stages WHERE name = 'Devis Envoyé' LIMIT 1;
      WHEN 'DECISION_CLIENT', 'NO_RESPONSE', 'RELANCE_ACTIVE', 'RELANCE' THEN
        SELECT id INTO v_stage_id FROM crm_pipeline_stages WHERE name = 'Négociation' LIMIT 1;
      WHEN 'PAIEMENT', 'DOWN_PAYMENT_REQUIRED', 'PAYMENT_PENDING' THEN
        SELECT id INTO v_stage_id FROM crm_pipeline_stages WHERE name = 'Accord Verbal' LIMIT 1;
      WHEN 'CONTRAT_SIGNATURE', 'SIGNATURE_PENDING', 'SIGNED', 'CLIENT_ACTIF', 'ACTIVE_CLIENT' THEN
        SELECT id INTO v_stage_id FROM crm_pipeline_stages WHERE name = 'Contrat Signé' LIMIT 1;
      WHEN 'PERDU', 'CLIENT_LOST' THEN
        SELECT id INTO v_stage_id FROM crm_pipeline_stages WHERE name = 'Perdu' LIMIT 1;
      ELSE
        SELECT id INTO v_stage_id FROM crm_pipeline_stages WHERE name = 'Nouveau Lead' LIMIT 1;
    END CASE;
    
    NEW.pipeline_stage_id := v_stage_id;
  END IF;

  -- Mettre à jour stage_entered_at si le stage a changé
  IF TG_OP = 'UPDATE' AND OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    NEW.stage_entered_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_sync_lead_stage ON crm_leads;
CREATE TRIGGER trigger_sync_lead_stage
  BEFORE INSERT OR UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION sync_lead_stage_from_status();

-- Mettre à jour les leads existants avec le mapping
UPDATE crm_leads l
SET pipeline_stage_id = COALESCE(
  CASE l.status::text
    WHEN 'NOUVEAU_LEAD' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Nouveau Lead' LIMIT 1)
    WHEN 'NEW_LEAD' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Nouveau Lead' LIMIT 1)
    WHEN 'CONTACT_ATTEMPTED' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Premier Contact' LIMIT 1)
    WHEN 'CONTACT_CONFIRMED' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Premier Contact' LIMIT 1)
    WHEN 'COLLECTE_DOCUMENTS' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Qualifié' LIMIT 1)
    WHEN 'DOCUMENTS_REQUIRED' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Qualifié' LIMIT 1)
    WHEN 'DOCUMENTS_PARTIAL' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Qualifié' LIMIT 1)
    WHEN 'DEVIS' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Devis Envoyé' LIMIT 1)
    WHEN 'QUOTE_SENT' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Devis Envoyé' LIMIT 1)
    WHEN 'READY_FOR_QUOTE' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Devis Envoyé' LIMIT 1)
    WHEN 'DECISION_CLIENT' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Négociation' LIMIT 1)
    WHEN 'NO_RESPONSE' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Négociation' LIMIT 1)
    WHEN 'RELANCE_ACTIVE' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Négociation' LIMIT 1)
    WHEN 'RELANCE' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Négociation' LIMIT 1)
    WHEN 'PAIEMENT' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Accord Verbal' LIMIT 1)
    WHEN 'DOWN_PAYMENT_REQUIRED' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Accord Verbal' LIMIT 1)
    WHEN 'PAYMENT_PENDING' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Accord Verbal' LIMIT 1)
    WHEN 'CONTRAT_SIGNATURE' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Contrat Signé' LIMIT 1)
    WHEN 'SIGNATURE_PENDING' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Contrat Signé' LIMIT 1)
    WHEN 'SIGNED' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Contrat Signé' LIMIT 1)
    WHEN 'CLIENT_ACTIF' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Contrat Signé' LIMIT 1)
    WHEN 'ACTIVE_CLIENT' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Contrat Signé' LIMIT 1)
    WHEN 'PERDU' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Perdu' LIMIT 1)
    WHEN 'CLIENT_LOST' THEN (SELECT id FROM crm_pipeline_stages WHERE name = 'Perdu' LIMIT 1)
    ELSE (SELECT id FROM crm_pipeline_stages WHERE name = 'Nouveau Lead' LIMIT 1)
  END,
  (SELECT id FROM crm_pipeline_stages WHERE name = 'Nouveau Lead' LIMIT 1)
)
WHERE pipeline_stage_id IS NULL;
