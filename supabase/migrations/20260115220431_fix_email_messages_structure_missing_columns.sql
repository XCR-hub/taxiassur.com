/*
  # Correction de la structure de la table email_messages
  
  1. Ajout des colonnes manquantes
    - provider (text) : fournisseur de l'email (ionos, brevo, sendgrid)
    - direction (text) : direction de l'email (inbound/outbound)
    - from_name (text) : nom de l'expéditeur
    - to_emails (text[]) : liste des destinataires
    - to_names (text[]) : noms des destinataires
    - attachments (jsonb) : pièces jointes
    - is_read (boolean) : email lu ou non
    - is_starred (boolean) : email favori
    - is_important (boolean) : email important
    - classification (text) : classification automatique
    - confidence_score (numeric) : score de confiance
    - lead_id (uuid) : lien vers le lead
    - auto_matched (boolean) : correspondance automatique
    - message_id (text) : identifiant unique du message
  
  2. Index pour améliorer les performances
  
  3. RLS déjà configuré sur la table
*/

-- Ajouter les colonnes manquantes
ALTER TABLE email_messages 
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS direction text CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS from_name text,
  ADD COLUMN IF NOT EXISTS to_emails text[],
  ADD COLUMN IF NOT EXISTS to_names text[],
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_starred boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_important boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS classification text,
  ADD COLUMN IF NOT EXISTS confidence_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_matched boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS message_id text UNIQUE;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_email_messages_provider ON email_messages(provider);
CREATE INDEX IF NOT EXISTS idx_email_messages_direction ON email_messages(direction);
CREATE INDEX IF NOT EXISTS idx_email_messages_lead_id ON email_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON email_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON email_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_from_email ON email_messages(from_email);
CREATE INDEX IF NOT EXISTS idx_email_messages_is_read ON email_messages(is_read) WHERE is_read = false;

-- Valeurs par défaut pour les anciennes lignes si elles existent
UPDATE email_messages 
SET 
  direction = 'inbound',
  is_read = false,
  is_starred = false,
  auto_matched = false,
  attachments = '[]'::jsonb
WHERE direction IS NULL;
