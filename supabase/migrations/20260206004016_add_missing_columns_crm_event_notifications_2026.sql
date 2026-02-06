/*
  # Add missing columns to crm_event_notifications

  Ajoute toutes les colonnes manquantes à crm_event_notifications :
  - type (text) - type de notification
  - action_url (text) - URL d'action pour la notification
  - dismissed (boolean) - si la notification a été masquée
*/

-- Ajouter la colonne type si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_event_notifications' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE crm_event_notifications 
    ADD COLUMN type TEXT;
  END IF;
END $$;

-- Ajouter la colonne action_url si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_event_notifications' 
    AND column_name = 'action_url'
  ) THEN
    ALTER TABLE crm_event_notifications 
    ADD COLUMN action_url TEXT;
  END IF;
END $$;

-- Ajouter la colonne dismissed si elle n'existe pas (si elle n'a pas déjà été ajoutée)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_event_notifications' 
    AND column_name = 'dismissed'
  ) THEN
    ALTER TABLE crm_event_notifications 
    ADD COLUMN dismissed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Créer des index pour les recherches
CREATE INDEX IF NOT EXISTS idx_crm_event_notifications_type 
ON crm_event_notifications(type);

CREATE INDEX IF NOT EXISTS idx_crm_event_notifications_dismissed 
ON crm_event_notifications(dismissed) WHERE dismissed = false;

-- Commentaires
COMMENT ON COLUMN crm_event_notifications.type IS 'Type de notification (document_rejected, quote_ready, etc.)';
COMMENT ON COLUMN crm_event_notifications.action_url IS 'URL pour l''action associée à la notification';
COMMENT ON COLUMN crm_event_notifications.dismissed IS 'Indique si la notification a été masquée par l''utilisateur';
