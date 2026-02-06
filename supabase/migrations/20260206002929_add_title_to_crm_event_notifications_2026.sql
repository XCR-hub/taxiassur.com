/*
  # Add title column to crm_event_notifications

  Ajoute la colonne title manquante à crm_event_notifications
  pour éviter les erreurs lors de la création de notifications
*/

-- Ajouter la colonne title si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_event_notifications' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE crm_event_notifications 
    ADD COLUMN title TEXT;
  END IF;
END $$;

-- Créer un index pour les recherches par title
CREATE INDEX IF NOT EXISTS idx_crm_event_notifications_title 
ON crm_event_notifications(title);

COMMENT ON COLUMN crm_event_notifications.title IS 'Titre court de la notification';
