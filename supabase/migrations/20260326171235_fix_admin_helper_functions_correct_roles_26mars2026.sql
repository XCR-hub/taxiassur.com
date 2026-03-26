/*
  # Fix admin helper functions to use correct role names

  1. Modified Functions
    - `is_admin_or_commercial` - Updated to check for 'master' and 'collaborator' roles (actual roles in admin_users)
    - `is_admin` - Updated to check for 'master' role
    
  2. Notes
    - admin_users table uses 'master' and 'collaborator' roles, not 'admin' and 'commercial'
    - This was preventing all inserts/updates on tables using these helper functions (including company_documents)
    - Files were uploaded to storage (no RLS) but DB records were silently rejected
*/

CREATE OR REPLACE FUNCTION public.is_admin_or_commercial()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.email = (auth.jwt()->>'email')
    AND admin_users.is_active = true
    AND admin_users.role IN ('master', 'collaborator', 'admin', 'commercial')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE (id = auth.uid() OR email = (auth.jwt()->>'email'))
    AND is_active = true
    AND role IN ('master', 'admin', 'super_admin', 'collaborator', 'commercial')
  );
END;
$$;