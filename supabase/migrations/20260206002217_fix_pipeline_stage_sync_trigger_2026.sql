/*
  # Fix Pipeline Stage Synchronization Trigger

  Crée un trigger pour synchroniser automatiquement le status quand pipeline_stage change

  Mapping:
  - nouveau_lead             → NOUVEAU_LEAD
  - collecte_documents       → DOCUMENTS_REQUIRED
  - saisie_devis             → READY_FOR_QUOTE
  - validation_devis_prospect → QUOTE_SENT
  - signature_devis          → SIGNATURE_PENDING
  - paiement_rib             → DOWN_PAYMENT_REQUIRED
  - contrat_signature        → CONTRAT_SIGNATURE
  - client_actif             → ACTIVE_CLIENT
*/

-- Créer une fonction pour synchroniser pipeline_stage → status
CREATE OR REPLACE FUNCTION sync_status_from_pipeline_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_status lead_status;
BEGIN
  -- Si pipeline_stage a changé, mettre à jour le status
  IF TG_OP = 'UPDATE' AND (OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage) THEN
    -- Mapper pipeline_stage → status
    v_new_status := map_pipeline_stage_to_status(NEW.pipeline_stage);

    IF v_new_status IS NOT NULL THEN
      NEW.status := v_new_status;
    END IF;
  END IF;

  -- Si c'est un INSERT et pipeline_stage est défini
  IF TG_OP = 'INSERT' AND NEW.pipeline_stage IS NOT NULL THEN
    v_new_status := map_pipeline_stage_to_status(NEW.pipeline_stage);

    IF v_new_status IS NOT NULL THEN
      NEW.status := v_new_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Créer le trigger (s'exécute AVANT les autres triggers)
DROP TRIGGER IF EXISTS trigger_sync_status_from_pipeline_stage ON crm_leads;
CREATE TRIGGER trigger_sync_status_from_pipeline_stage
  BEFORE INSERT OR UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION sync_status_from_pipeline_stage();

COMMENT ON FUNCTION sync_status_from_pipeline_stage IS 'Synchronise automatiquement le status quand pipeline_stage change';
COMMENT ON TRIGGER trigger_sync_status_from_pipeline_stage ON crm_leads IS 'Synchronise le status avec pipeline_stage lors des INSERT/UPDATE';
