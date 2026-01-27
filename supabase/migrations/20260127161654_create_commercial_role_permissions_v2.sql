/*
  # Système de Permissions pour Rôle Commercial V2
  
  1. Modifications
    - Adapter à la structure existante (permission_type au lieu de permission_key)
    - Ajouter rôle 'commercial'
    - Ajouter colonne can_create
    - Définir permissions par défaut
*/

-- Modifier la contrainte de rôle pour inclure 'commercial'
DO $$
BEGIN
  ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
  ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check 
  CHECK (role IN ('master', 'admin', 'collaborator', 'commercial'));
END $$;

-- Ajouter colonne can_create si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_permissions' 
    AND column_name = 'can_create'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_create boolean DEFAULT false;
  END IF;
END $$;

-- Fonction pour créer permissions par défaut pour commercial
CREATE OR REPLACE FUNCTION create_commercial_default_permissions(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Pipeline Kanban - Full access
  INSERT INTO user_permissions (user_id, permission_type, can_view, can_edit, can_delete, can_create)
  VALUES (p_user_id, 'pipeline_kanban', true, true, true, true)
  ON CONFLICT (user_id, permission_type) DO UPDATE
  SET can_view = true, can_edit = true, can_delete = true, can_create = true;
  
  -- Inbox Multicanal - Full access
  INSERT INTO user_permissions (user_id, permission_type, can_view, can_edit, can_delete, can_create)
  VALUES (p_user_id, 'inbox_multicanal', true, true, true, true)
  ON CONFLICT (user_id, permission_type) DO UPDATE
  SET can_view = true, can_edit = true, can_delete = true, can_create = true;
  
  -- Leads - Full access (create, view, edit)
  INSERT INTO user_permissions (user_id, permission_type, can_view, can_edit, can_delete, can_create)
  VALUES (p_user_id, 'crm_leads', true, true, false, true)
  ON CONFLICT (user_id, permission_type) DO UPDATE
  SET can_view = true, can_edit = true, can_delete = false, can_create = true;
  
  -- Documents - View only
  INSERT INTO user_permissions (user_id, permission_type, can_view, can_edit, can_delete, can_create)
  VALUES (p_user_id, 'documents', true, false, false, false)
  ON CONFLICT (user_id, permission_type) DO UPDATE
  SET can_view = true, can_edit = false, can_delete = false, can_create = false;
  
  -- Analytics - View own stats only
  INSERT INTO user_permissions (user_id, permission_type, can_view, can_edit, can_delete, can_create)
  VALUES (p_user_id, 'analytics_personal', true, false, false, false)
  ON CONFLICT (user_id, permission_type) DO UPDATE
  SET can_view = true, can_edit = false, can_delete = false, can_create = false;
  
  -- Deny: Settings, User Management, SEO, Marketing automation
  INSERT INTO user_permissions (user_id, permission_type, can_view, can_edit, can_delete, can_create)
  VALUES 
    (p_user_id, 'settings', false, false, false, false),
    (p_user_id, 'user_management', false, false, false, false),
    (p_user_id, 'seo_tools', false, false, false, false),
    (p_user_id, 'marketing_automation', false, false, false, false)
  ON CONFLICT (user_id, permission_type) DO UPDATE
  SET can_view = false, can_edit = false, can_delete = false, can_create = false;
END;
$$;

-- Fonction pour vérifier si un user a une permission
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id uuid,
  p_permission_type text,
  p_action text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_permission boolean := false;
  v_role text;
BEGIN
  -- Master et Admin ont toutes les permissions
  SELECT role INTO v_role FROM admin_users WHERE id = p_user_id;
  
  IF v_role IN ('master', 'admin') THEN
    RETURN true;
  END IF;
  
  -- Check permission for other roles
  SELECT 
    CASE p_action
      WHEN 'view' THEN can_view
      WHEN 'edit' THEN can_edit
      WHEN 'delete' THEN can_delete
      WHEN 'create' THEN can_create
      ELSE false
    END INTO v_has_permission
  FROM user_permissions
  WHERE user_id = p_user_id 
  AND permission_type = p_permission_type;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_commercial_default_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission(uuid, text, text) TO authenticated, anon;

COMMENT ON FUNCTION create_commercial_default_permissions IS 'Crée permissions par défaut pour commerciaux';
COMMENT ON FUNCTION has_permission IS 'Vérifie si un utilisateur a une permission donnée';
