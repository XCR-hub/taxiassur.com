/*
  # Ajouter lead_id à email_conversations
  
  1. Modifications
    - Ajouter colonne lead_id à email_conversations
    - Créer foreign key vers crm_leads
    - Créer index pour les performances
  
  2. Sécurité
    - RLS déjà activé sur la table
*/

-- Ajouter la colonne lead_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_conversations' AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE email_conversations
    ADD COLUMN lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_email_conversations_lead_id 
    ON email_conversations(lead_id);
    
    COMMENT ON COLUMN email_conversations.lead_id IS 'Référence au lead CRM associé à cette conversation';
  END IF;
END $$;
