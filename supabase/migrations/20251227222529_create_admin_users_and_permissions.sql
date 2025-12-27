/*
  # Système de gestion des utilisateurs du backoffice

  ## Description
  Cette migration crée le système complet de gestion des utilisateurs administrateurs
  et de leurs permissions pour accéder aux différentes sections du backoffice.

  ## 1. Nouvelles Tables
    - `admin_users`
      - `id` (uuid, primary key) - Identifiant unique
      - `email` (text, unique) - Email de connexion
      - `password_hash` (text) - Hash du mot de passe
      - `full_name` (text) - Nom complet
      - `role` (text) - Rôle (master, collaborator)
      - `is_active` (boolean) - Compte actif ou non
      - `created_at` (timestamptz) - Date de création
      - `created_by` (uuid) - ID de l'utilisateur créateur
      - `last_login` (timestamptz) - Dernière connexion

    - `user_permissions`
      - `id` (uuid, primary key) - Identifiant unique
      - `user_id` (uuid, foreign key) - Référence vers admin_users
      - `permission_type` (text) - Type de permission (crm_leads, marketplace, content_ia, seo, analytics, settings)
      - `can_view` (boolean) - Peut voir
      - `can_edit` (boolean) - Peut modifier
      - `can_delete` (boolean) - Peut supprimer
      - `created_at` (timestamptz) - Date de création

  ## 2. Sécurité
    - Enable RLS sur toutes les tables
    - Policies restrictives : seuls les utilisateurs master peuvent gérer les utilisateurs
    - Les collaborateurs peuvent seulement voir leur propre profil et permissions

  ## 3. Index
    - Index sur email pour recherche rapide
    - Index sur user_id dans permissions pour jointures optimisées

  ## 4. Notes Importantes
    - Les mots de passe sont stockés en hash (à gérer côté client avec bcrypt)
    - Le rôle 'master' a tous les droits
    - Les permissions sont granulaires par thème
*/

-- Créer la table des utilisateurs administrateurs
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'collaborator' CHECK (role IN ('master', 'collaborator')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id),
  last_login timestamptz,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Créer la table des permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  permission_type text NOT NULL CHECK (permission_type IN ('crm_leads', 'marketplace', 'content_ia', 'seo', 'analytics', 'settings', 'backlinks', 'social_media')),
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_type)
);

-- Index pour optimisation
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_type ON user_permissions(permission_type);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Policies pour admin_users
-- Les utilisateurs master peuvent tout voir
CREATE POLICY "Master users can view all users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
      AND au.role = 'master'
      AND au.is_active = true
    )
  );

-- Les collaborateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON admin_users FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND is_active = true);

-- Seuls les master peuvent créer des utilisateurs
CREATE POLICY "Master users can create users"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
      AND au.role = 'master'
      AND au.is_active = true
    )
  );

-- Seuls les master peuvent mettre à jour les utilisateurs
CREATE POLICY "Master users can update users"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
      AND au.role = 'master'
      AND au.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
      AND au.role = 'master'
      AND au.is_active = true
    )
  );

-- Les utilisateurs peuvent mettre à jour leur dernier login
CREATE POLICY "Users can update own last login"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND is_active = true)
  WITH CHECK (id = auth.uid() AND is_active = true);

-- Seuls les master peuvent supprimer des utilisateurs
CREATE POLICY "Master users can delete users"
  ON admin_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
      AND au.role = 'master'
      AND au.is_active = true
    )
  );

-- Policies pour user_permissions
-- Les master peuvent voir toutes les permissions
CREATE POLICY "Master users can view all permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
      AND au.role = 'master'
      AND au.is_active = true
    )
  );

-- Les utilisateurs peuvent voir leurs propres permissions
CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = true
    )
  );

-- Seuls les master peuvent créer des permissions
CREATE POLICY "Master users can create permissions"
  ON user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
      AND au.role = 'master'
      AND au.is_active = true
    )
  );

-- Seuls les master peuvent mettre à jour les permissions
CREATE POLICY "Master users can update permissions"
  ON user_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
      AND au.role = 'master'
      AND au.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
      AND au.role = 'master'
      AND au.is_active = true
    )
  );

-- Seuls les master peuvent supprimer des permissions
CREATE POLICY "Master users can delete permissions"
  ON user_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
      AND au.role = 'master'
      AND au.is_active = true
    )
  );

-- Créer une fonction helper pour vérifier les permissions
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id uuid,
  p_permission_type text,
  p_action text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_master boolean;
  v_has_perm boolean;
BEGIN
  -- Vérifier si l'utilisateur est master
  SELECT role = 'master' AND is_active = true
  INTO v_is_master
  FROM admin_users
  WHERE id = p_user_id;
  
  -- Les master ont toutes les permissions
  IF v_is_master THEN
    RETURN true;
  END IF;
  
  -- Vérifier la permission spécifique
  IF p_action = 'view' THEN
    SELECT can_view INTO v_has_perm
    FROM user_permissions
    WHERE user_id = p_user_id AND permission_type = p_permission_type;
  ELSIF p_action = 'edit' THEN
    SELECT can_edit INTO v_has_perm
    FROM user_permissions
    WHERE user_id = p_user_id AND permission_type = p_permission_type;
  ELSIF p_action = 'delete' THEN
    SELECT can_delete INTO v_has_perm
    FROM user_permissions
    WHERE user_id = p_user_id AND permission_type = p_permission_type;
  END IF;
  
  RETURN COALESCE(v_has_perm, false);
END;
$$;
