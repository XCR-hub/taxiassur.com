/*
  # Fix admin_users role constraint and validation
  
  1. Changes
    - Add 'support' role to CHECK constraint
    - Keep email validation strict but clear
  
  2. Notes
    - Emails must have valid TLD (.com, .fr, etc.)
    - Example: user@domain.com ✓ | user@domain ✗
*/

-- Add 'support' to the role constraint
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check 
  CHECK (role IN ('master', 'admin', 'collaborator', 'commercial', 'support'));

-- Add index on role if not exists
CREATE INDEX IF NOT EXISTS idx_admin_users_role_active ON admin_users(role, is_active) WHERE is_active = true;

-- Add helpful comment
COMMENT ON CONSTRAINT admin_users_role_check ON admin_users IS 
  'Valid roles: master, admin, collaborator, commercial, support';
  
COMMENT ON CONSTRAINT valid_email ON admin_users IS 
  'Email must be valid format with TLD (e.g., user@domain.com, not user@domain)';