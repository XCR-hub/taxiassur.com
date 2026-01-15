/*
  # Create Client Authentication System

  1. New Tables
    - `client_accounts` - Stores client login credentials
    - `password_reset_tokens` - Temporary tokens for password reset

  2. Security
    - Enable RLS on all tables
    - Password hashing with pgcrypto
    - Secure password reset flow
*/

-- Enable pgcrypto for password hashing (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table for client accounts
CREATE TABLE IF NOT EXISTS client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  must_change_password boolean DEFAULT true,
  last_login_at timestamptz,
  login_attempts integer DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

-- Table for password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid REFERENCES client_accounts(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_accounts_email ON client_accounts(email);
CREATE INDEX IF NOT EXISTS idx_client_accounts_lead_id ON client_accounts(lead_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Enable RLS
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_accounts
DROP POLICY IF EXISTS "Clients can view own account" ON client_accounts;
CREATE POLICY "Clients can view own account"
  ON client_accounts
  FOR SELECT
  TO authenticated
  USING (email = auth.jwt()->>'email');

DROP POLICY IF EXISTS "Clients can update own password" ON client_accounts;
CREATE POLICY "Clients can update own password"
  ON client_accounts
  FOR UPDATE
  TO authenticated
  USING (email = auth.jwt()->>'email')
  WITH CHECK (email = auth.jwt()->>'email');

DROP POLICY IF EXISTS "Admins can manage client accounts" ON client_accounts;
CREATE POLICY "Admins can manage client accounts"
  ON client_accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- RLS Policies for password_reset_tokens
DROP POLICY IF EXISTS "Admins can manage reset tokens" ON password_reset_tokens;
CREATE POLICY "Admins can manage reset tokens"
  ON password_reset_tokens
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Function to create client account
CREATE OR REPLACE FUNCTION create_client_account(
  p_email text,
  p_lead_id uuid,
  p_password text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_password text;
  v_account_id uuid;
  v_result jsonb;
BEGIN
  -- Generate random password if not provided
  IF p_password IS NULL THEN
    v_password := 'Taxi' || floor(random() * 9000 + 1000)::text || '!';
  ELSE
    v_password := p_password;
  END IF;

  -- Check if account already exists
  IF EXISTS (SELECT 1 FROM client_accounts WHERE email = p_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Account already exists'
    );
  END IF;

  -- Create account
  INSERT INTO client_accounts (
    lead_id,
    email,
    password_hash,
    must_change_password,
    created_by
  ) VALUES (
    p_lead_id,
    p_email,
    crypt(v_password, gen_salt('bf')),
    p_password IS NULL,
    auth.uid()
  )
  RETURNING id INTO v_account_id;

  v_result := jsonb_build_object(
    'success', true,
    'account_id', v_account_id,
    'email', p_email,
    'temporary_password', v_password,
    'must_change_password', p_password IS NULL
  );

  RETURN v_result;
END;
$$;

-- Function to verify client login
CREATE OR REPLACE FUNCTION verify_client_login(
  p_email text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account client_accounts;
  v_result jsonb;
BEGIN
  -- Get account
  SELECT * INTO v_account
  FROM client_accounts
  WHERE email = p_email;

  -- Check if account exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid credentials'
    );
  END IF;

  -- Check if account is locked
  IF v_account.locked_until IS NOT NULL AND v_account.locked_until > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Account is locked. Please try again later.',
      'locked_until', v_account.locked_until
    );
  END IF;

  -- Verify password
  IF v_account.password_hash = crypt(p_password, v_account.password_hash) THEN
    -- Password correct
    UPDATE client_accounts
    SET
      last_login_at = now(),
      login_attempts = 0,
      locked_until = NULL
    WHERE id = v_account.id;

    v_result := jsonb_build_object(
      'success', true,
      'account_id', v_account.id,
      'email', v_account.email,
      'must_change_password', v_account.must_change_password,
      'lead_id', v_account.lead_id
    );
  ELSE
    -- Password incorrect
    UPDATE client_accounts
    SET
      login_attempts = login_attempts + 1,
      locked_until = CASE
        WHEN login_attempts + 1 >= 5 THEN now() + interval '15 minutes'
        ELSE NULL
      END
    WHERE id = v_account.id;

    v_result := jsonb_build_object(
      'success', false,
      'error', 'Invalid credentials',
      'attempts_remaining', 5 - (v_account.login_attempts + 1)
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Function to change password
CREATE OR REPLACE FUNCTION change_client_password(
  p_email text,
  p_old_password text,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account client_accounts;
BEGIN
  -- Get account
  SELECT * INTO v_account
  FROM client_accounts
  WHERE email = p_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account not found');
  END IF;

  -- Verify old password
  IF v_account.password_hash != crypt(p_old_password, v_account.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid current password');
  END IF;

  -- Validate new password (min 8 chars, 1 uppercase, 1 number, 1 special)
  IF length(p_new_password) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters');
  END IF;

  -- Update password
  UPDATE client_accounts
  SET
    password_hash = crypt(p_new_password, gen_salt('bf')),
    must_change_password = false,
    updated_at = now()
  WHERE id = v_account.id;

  RETURN jsonb_build_object('success', true, 'message', 'Password changed successfully');
END;
$$;

-- Function to request password reset
CREATE OR REPLACE FUNCTION request_password_reset(
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_token text;
  v_result jsonb;
BEGIN
  -- Get account
  SELECT id INTO v_account_id
  FROM client_accounts
  WHERE email = p_email;

  IF NOT FOUND THEN
    -- Don't reveal if email exists
    RETURN jsonb_build_object(
      'success', true,
      'message', 'If account exists, reset email will be sent'
    );
  END IF;

  -- Generate token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Invalidate old tokens
  UPDATE password_reset_tokens
  SET used_at = now()
  WHERE client_account_id = v_account_id
  AND used_at IS NULL;

  -- Create new token
  INSERT INTO password_reset_tokens (
    client_account_id,
    token,
    expires_at
  ) VALUES (
    v_account_id,
    v_token,
    now() + interval '1 hour'
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Reset email sent',
    'token', v_token,
    'email', p_email
  );

  RETURN v_result;
END;
$$;

-- Function to reset password with token
CREATE OR REPLACE FUNCTION reset_password_with_token(
  p_token text,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reset_token password_reset_tokens;
  v_account_id uuid;
BEGIN
  -- Get token
  SELECT * INTO v_reset_token
  FROM password_reset_tokens
  WHERE token = p_token
  AND used_at IS NULL
  AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired token'
    );
  END IF;

  -- Validate new password
  IF length(p_new_password) < 8 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Password must be at least 8 characters'
    );
  END IF;

  -- Update password
  UPDATE client_accounts
  SET
    password_hash = crypt(p_new_password, gen_salt('bf')),
    must_change_password = false,
    login_attempts = 0,
    locked_until = NULL,
    updated_at = now()
  WHERE id = v_reset_token.client_account_id;

  -- Mark token as used
  UPDATE password_reset_tokens
  SET used_at = now()
  WHERE id = v_reset_token.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password reset successfully'
  );
END;
$$;

-- Function for admin to reset client password
CREATE OR REPLACE FUNCTION admin_reset_client_password(
  p_client_email text,
  p_new_password text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_password text;
  v_account_id uuid;
BEGIN
  -- Check admin permission
  IF NOT EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Generate random password if not provided
  IF p_new_password IS NULL THEN
    v_password := 'Taxi' || floor(random() * 9000 + 1000)::text || '!';
  ELSE
    v_password := p_new_password;
  END IF;

  -- Get account
  SELECT id INTO v_account_id
  FROM client_accounts
  WHERE email = p_client_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account not found');
  END IF;

  -- Update password
  UPDATE client_accounts
  SET
    password_hash = crypt(v_password, gen_salt('bf')),
    must_change_password = true,
    login_attempts = 0,
    locked_until = NULL,
    updated_at = now()
  WHERE id = v_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password reset successfully',
    'temporary_password', v_password
  );
END;
$$;

-- Comments
COMMENT ON TABLE client_accounts IS 'Client login accounts with secure password storage';
COMMENT ON TABLE password_reset_tokens IS 'Temporary tokens for password reset flow';
