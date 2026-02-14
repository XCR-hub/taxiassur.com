/*
  # Fix compatibilité CRM Dashboard - current_stage_key

  1. Problème
    - Le code TypeScript cherche "current_stage_key"
    - La base de données a "pipeline_stage"
    - Les leads ne s'affichent pas dans le CRM

  2. Solution
    - Ajouter un alias current_stage_key -> pipeline_stage
    - Ou créer une vue compatible
*/

-- Ajouter la colonne current_stage_key comme alias de pipeline_stage
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS current_stage_key text;

-- Trigger pour synchroniser pipeline_stage <-> current_stage_key
CREATE OR REPLACE FUNCTION sync_stage_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Si current_stage_key est modifié, sync vers pipeline_stage
  IF NEW.current_stage_key IS DISTINCT FROM OLD.current_stage_key THEN
    NEW.pipeline_stage := NEW.current_stage_key;
  END IF;
  
  -- Si pipeline_stage est modifié, sync vers current_stage_key
  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    NEW.current_stage_key := NEW.pipeline_stage;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger
DROP TRIGGER IF EXISTS sync_stage_columns_trigger ON crm_leads;
CREATE TRIGGER sync_stage_columns_trigger
BEFORE INSERT OR UPDATE ON crm_leads
FOR EACH ROW
EXECUTE FUNCTION sync_stage_columns();

-- Synchroniser les données existantes
UPDATE crm_leads
SET current_stage_key = pipeline_stage
WHERE current_stage_key IS NULL OR current_stage_key != pipeline_stage;

-- Vérifier
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN current_stage_key IS NOT NULL THEN 1 END) as avec_stage,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as actifs
FROM crm_leads;
