/*
  # Add metadata column to crm_event_notifications

  Ajoute la colonne metadata manquante à crm_event_notifications
  pour stocker des données supplémentaires sur les notifications
*/

-- Ajouter la colonne metadata si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_event_notifications' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE crm_event_notifications 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Créer un index GIN pour les recherches JSON
CREATE INDEX IF NOT EXISTS idx_crm_event_notifications_metadata 
ON crm_event_notifications USING GIN (metadata);

COMMENT ON COLUMN crm_event_notifications.metadata IS 'Données supplémentaires de la notification au format JSON';
