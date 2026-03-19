/*
  # Fix admin_users ID sync and lead attribution system

  ## Problem
  When a user is invited, an admin_users entry is created with the auth user ID from
  generateLink(). But if the invite link expires and a recovery/new link is sent,
  Supabase may create a NEW auth user with a DIFFERENT UUID.
  
  The RLS on crm_leads checks: `EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())`
  So if admin_users.id != auth.uid(), the user sees 0 leads.

  ## Fix
  1. Sync Tony CERDA's admin_users.id to match his actual auth.uid()
  2. Add a sync function for future use
  3. Add a helper RPC that admins can call to re-sync a user by email

  ## New Tables / Functions
  - `sync_admin_user_by_email(p_email, p_auth_uid)` RPC - syncs admin_users.id
  - Automatic fix for tcerda@xcr.fr
*/

-- Step 1: Fix Tony CERDA's admin_users ID
-- His auth.uid() is 'dbeacfd1-1957-4e8e-a984-ed9a64bf5052'
-- His admin_users.id is '61e19b8b-30c7-482e-bed2-b15e2d1307b8' (wrong)
DO $$
DECLARE
  v_old_id uuid := '61e19b8b-30c7-482e-bed2-b15e2d1307b8';
  v_new_id uuid := 'dbeacfd1-1957-4e8e-a984-ed9a64bf5052';
  v_email text := 'tcerda@xcr.fr';
BEGIN
  -- Only proceed if the old ID exists and new ID doesn't
  IF EXISTS (SELECT 1 FROM admin_users WHERE id = v_old_id AND email = v_email)
     AND NOT EXISTS (SELECT 1 FROM admin_users WHERE id = v_new_id) THEN
    
    -- Delete old record
    DELETE FROM admin_users WHERE id = v_old_id AND email = v_email;
    
    -- Insert with correct auth UUID
    INSERT INTO admin_users (id, email, full_name, role, is_active, created_at)
    VALUES (v_new_id, v_email, 'Tony CERDA', 'collaborator', true, now())
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Fixed admin_users ID for %', v_email;
  ELSE
    RAISE NOTICE 'No fix needed or already fixed for %', v_email;
  END IF;
END $$;

-- Step 2: Create a helper function so admins can fix future ID mismatches
CREATE OR REPLACE FUNCTION sync_admin_user_by_email(
  p_email text,
  p_auth_uid uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_full_name text;
  v_role text;
BEGIN
  -- Get existing admin_users entry
  SELECT id, full_name, role
  INTO v_existing_id, v_full_name, v_role
  FROM admin_users
  WHERE email = p_email AND is_active = true
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in admin_users');
  END IF;

  IF v_existing_id = p_auth_uid THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already in sync');
  END IF;

  -- Delete old and insert with correct ID
  DELETE FROM admin_users WHERE id = v_existing_id AND email = p_email;
  
  INSERT INTO admin_users (id, email, full_name, role, is_active, created_at)
  VALUES (p_auth_uid, p_email, v_full_name, v_role, true, now())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Synced successfully',
    'old_id', v_existing_id,
    'new_id', p_auth_uid
  );
END $$;

GRANT EXECUTE ON FUNCTION sync_admin_user_by_email TO authenticated;

-- Step 3: Add assigned_at column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'assigned_at'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN assigned_at timestamptz;
  END IF;
END $$;

-- Step 4: Create index for assigned_to lookups
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_to ON crm_leads(assigned_to) WHERE assigned_to IS NOT NULL;
