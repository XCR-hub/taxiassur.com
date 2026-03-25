/*
  # Fix admin_users SELECT policy - allow anon role

  1. Problem
    - The admin_users SELECT policy only allows `authenticated` role
    - When the Supabase session token expires but the user is still cached as logged in,
      queries fall back to `anon` role and return 0 rows
    - This causes the "Gestion des Utilisateurs" page to show 0 users

  2. Fix
    - Drop the existing restrictive SELECT policy
    - Create a new SELECT policy that allows both `anon` and `authenticated` roles
    - This matches the pattern already used for `user_permissions` table
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.admin_users'::regclass
    AND polname = 'admin_users_select_all'
  ) THEN
    DROP POLICY "admin_users_select_all" ON admin_users;
  END IF;
END $$;

CREATE POLICY "admin_users_select_all_roles"
  ON admin_users
  FOR SELECT
  TO anon, authenticated
  USING (true);
