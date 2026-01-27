/*
  # Système de Gestion d'Emails Type Outlook

  1. Nouvelles Tables
    - email_folders : Dossiers personnalisés pour organiser les emails

  2. Modifications
    - Ajouter colonnes email_status et folder_id à email_messages
    - Créer index pour performances

  3. Fonctions
    - move_email_to_folder : Déplacer un email dans un dossier
    - archive_email : Archiver un email
    - delete_email : Mettre à la corbeille
    - mark_as_spam : Marquer comme spam
    - restore_email : Restaurer un email

  4. Sécurité
    - RLS sur email_folders
*/

-- Table pour les dossiers personnalisés
CREATE TABLE IF NOT EXISTS email_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT '📁',
  color text DEFAULT '#6B7280',
  parent_folder_id uuid REFERENCES email_folders(id) ON DELETE CASCADE,
  created_by uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  is_system boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_folder_name_per_user UNIQUE (name, created_by)
);

-- Index sur email_folders
CREATE INDEX IF NOT EXISTS idx_email_folders_created_by ON email_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_email_folders_parent ON email_folders(parent_folder_id);

-- Ajouter colonnes à email_messages
DO $$
BEGIN
  -- Colonne status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_messages' AND column_name = 'email_status'
  ) THEN
    ALTER TABLE email_messages ADD COLUMN email_status text DEFAULT 'active' CHECK (email_status IN ('active', 'archived', 'deleted', 'spam'));
  END IF;

  -- Colonne folder_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_messages' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE email_messages ADD COLUMN folder_id uuid REFERENCES email_folders(id) ON DELETE SET NULL;
  END IF;

  -- Colonne deleted_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_messages' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE email_messages ADD COLUMN deleted_at timestamptz;
  END IF;

  -- Colonne archived_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_messages' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE email_messages ADD COLUMN archived_at timestamptz;
  END IF;
END $$;

-- Index sur les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_email_messages_status ON email_messages(email_status);
CREATE INDEX IF NOT EXISTS idx_email_messages_folder ON email_messages(folder_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_deleted_at ON email_messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- Fonction pour déplacer un email dans un dossier
CREATE OR REPLACE FUNCTION move_email_to_folder(
  p_email_id uuid,
  p_folder_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Vérifier que le dossier existe
  IF p_folder_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM email_folders WHERE id = p_folder_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Dossier introuvable');
  END IF;

  -- Déplacer l'email
  UPDATE email_messages
  SET
    folder_id = p_folder_id,
    updated_at = now()
  WHERE id = p_email_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Email introuvable');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Email déplacé avec succès');
END;
$$;

-- Fonction pour archiver un email
CREATE OR REPLACE FUNCTION archive_email(p_email_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_messages
  SET
    email_status = 'archived',
    archived_at = now(),
    updated_at = now()
  WHERE id = p_email_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Email introuvable');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Email archivé');
END;
$$;

-- Fonction pour mettre à la corbeille
CREATE OR REPLACE FUNCTION delete_email(p_email_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_messages
  SET
    email_status = 'deleted',
    deleted_at = now(),
    updated_at = now()
  WHERE id = p_email_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Email introuvable');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Email mis à la corbeille');
END;
$$;

-- Fonction pour marquer comme spam
CREATE OR REPLACE FUNCTION mark_as_spam(p_email_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_messages
  SET
    email_status = 'spam',
    updated_at = now()
  WHERE id = p_email_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Email introuvable');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Email marqué comme spam');
END;
$$;

-- Fonction pour restaurer un email
CREATE OR REPLACE FUNCTION restore_email(p_email_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_messages
  SET
    email_status = 'active',
    deleted_at = NULL,
    archived_at = NULL,
    updated_at = now()
  WHERE id = p_email_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Email introuvable');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Email restauré');
END;
$$;

-- Fonction pour supprimer définitivement (après 30 jours dans la corbeille)
CREATE OR REPLACE FUNCTION permanently_delete_old_emails()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Supprimer les emails en corbeille depuis plus de 30 jours
  DELETE FROM email_messages
  WHERE email_status = 'deleted'
  AND deleted_at < now() - interval '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

-- Insérer les dossiers système par défaut
INSERT INTO email_folders (name, icon, color, is_system, display_order)
VALUES
  ('Boîte de réception', '📥', '#3B82F6', true, 1),
  ('Envoyés', '📤', '#10B981', true, 2),
  ('Brouillons', '📝', '#F59E0B', true, 3),
  ('Archives', '📦', '#6B7280', true, 4),
  ('Corbeille', '🗑️', '#EF4444', true, 5),
  ('Spam', '⚠️', '#DC2626', true, 6)
ON CONFLICT (name, created_by) DO NOTHING;

-- RLS sur email_folders
ALTER TABLE email_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all folders"
  ON email_folders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'commercial', 'collaborator')
    )
  );

CREATE POLICY "Admins can create their own folders"
  ON email_folders FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'commercial', 'collaborator')
    )
  );

CREATE POLICY "Admins can update their own folders"
  ON email_folders FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() AND
    NOT is_system AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'commercial', 'collaborator')
    )
  );

CREATE POLICY "Admins can delete their own folders"
  ON email_folders FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() AND
    NOT is_system AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('master', 'admin', 'commercial', 'collaborator')
    )
  );

-- Grant permissions
GRANT ALL ON email_folders TO authenticated;
GRANT EXECUTE ON FUNCTION move_email_to_folder(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION archive_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_as_spam(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION permanently_delete_old_emails() TO authenticated;

-- Commentaires
COMMENT ON TABLE email_folders IS 'Dossiers personnalisés pour organiser les emails';
COMMENT ON FUNCTION move_email_to_folder IS 'Déplace un email dans un dossier';
COMMENT ON FUNCTION archive_email IS 'Archive un email';
COMMENT ON FUNCTION delete_email IS 'Met un email à la corbeille';
COMMENT ON FUNCTION mark_as_spam IS 'Marque un email comme spam';
COMMENT ON FUNCTION restore_email IS 'Restaure un email supprimé ou archivé';
COMMENT ON FUNCTION permanently_delete_old_emails IS 'Supprime définitivement les emails en corbeille depuis plus de 30 jours';