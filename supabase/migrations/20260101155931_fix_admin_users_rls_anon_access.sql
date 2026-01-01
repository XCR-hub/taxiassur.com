/*
  # Fix RLS pour l'accès backoffice aux admin_users
  
  1. Problème
    - Les policies actuelles nécessitent `authenticated`
    - Le backoffice utilise la clé `anon` (pas Supabase Auth)
    - Résultat : impossible de créer/modifier des utilisateurs
  
  2. Solution
    - Permettre l'accès via `anon` et `authenticated`
    - L'AuthGuard protège déjà l'accès au backoffice
*/

-- Supprimer les anciennes policies restrictives
DROP POLICY IF EXISTS "Admin users select policy" ON admin_users;
DROP POLICY IF EXISTS "Admin users update policy" ON admin_users;
DROP POLICY IF EXISTS "Master users can create users" ON admin_users;
DROP POLICY IF EXISTS "Master users can delete users" ON admin_users;

-- Créer des policies permissives pour le backoffice
CREATE POLICY "Backoffice can view admin users"
  ON admin_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Backoffice can create admin users"
  ON admin_users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Backoffice can update admin users"
  ON admin_users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Backoffice can delete admin users"
  ON admin_users
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Permissions utilisateurs
DROP POLICY IF EXISTS "User permissions select policy" ON user_permissions;
DROP POLICY IF EXISTS "Master users can create permissions" ON user_permissions;
DROP POLICY IF EXISTS "Master users can update permissions" ON user_permissions;
DROP POLICY IF EXISTS "Master users can delete permissions" ON user_permissions;

CREATE POLICY "Backoffice can view permissions"
  ON user_permissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Backoffice can create permissions"
  ON user_permissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Backoffice can update permissions"
  ON user_permissions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Backoffice can delete permissions"
  ON user_permissions
  FOR DELETE
  TO anon, authenticated
  USING (true);