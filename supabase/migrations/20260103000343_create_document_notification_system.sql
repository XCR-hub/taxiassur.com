/*
  # Système de notifications pour uploads de documents

  1. Nouvelle table
    - `admin_notifications` : notifications pour le backoffice
      - `id` (uuid, PK)
      - `type` (text) : type de notification (document_uploaded, lead_created, etc.)
      - `title` (text) : titre court de la notification
      - `message` (text) : message détaillé
      - `lead_id` (uuid) : référence au lead concerné
      - `document_id` (uuid) : référence au document uploadé (optionnel)
      - `is_read` (boolean) : statut de lecture
      - `read_at` (timestamptz) : date de lecture
      - `created_at` (timestamptz)
      - `metadata` (jsonb) : données additionnelles

  2. Sécurité
    - RLS activé
    - Politique pour les admins authentifiés
*/

-- Table des notifications admin
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  document_id uuid REFERENCES prospect_documents(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_lead_id ON admin_notifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);

-- RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Politique : les admins authentifiés peuvent tout voir
CREATE POLICY "Admins can view all notifications"
  ON admin_notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique : les admins peuvent marquer comme lu
CREATE POLICY "Admins can update notifications"
  ON admin_notifications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION create_admin_notification(
  p_type text,
  p_title text,
  p_message text,
  p_lead_id uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO admin_notifications (
    type,
    title,
    message,
    lead_id,
    document_id,
    metadata
  ) VALUES (
    p_type,
    p_title,
    p_message,
    p_lead_id,
    p_document_id,
    p_metadata
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Fonction pour marquer une notification comme lue
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_notifications
  SET is_read = true, read_at = now()
  WHERE id = notification_id;
END;
$$;

-- Fonction pour marquer toutes les notifications comme lues
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_notifications
  SET is_read = true, read_at = now()
  WHERE is_read = false;
END;
$$;