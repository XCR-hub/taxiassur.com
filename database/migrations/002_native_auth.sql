BEGIN;

CREATE TABLE IF NOT EXISTS taxiassur.auth_users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'collaborator' CHECK (role IN ('master', 'collaborator')),
  is_active boolean NOT NULL DEFAULT true,
  password_hash text,
  password_initialized_at timestamptz,
  last_login_at timestamptz,
  failed_login_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_users_email_lower_uidx ON taxiassur.auth_users (lower(email));

INSERT INTO taxiassur.auth_users (id, email, full_name, role, is_active, created_at, updated_at)
SELECT
  record_id::uuid,
  lower(data ->> 'email'),
  COALESCE(data ->> 'full_name', data ->> 'email', ''),
  CASE WHEN data ->> 'role' = 'master' THEN 'master' ELSE 'collaborator' END,
  COALESCE((data ->> 'is_active')::boolean, true),
  COALESCE(NULLIF(data ->> 'created_at', '')::timestamptz, now()),
  now()
FROM taxiassur.records
WHERE collection = 'admin_users'
  AND record_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND COALESCE(data ->> 'email', '') <> ''
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

CREATE TABLE IF NOT EXISTS taxiassur.revoked_sessions (
  session_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES taxiassur.auth_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS revoked_sessions_expiry_idx ON taxiassur.revoked_sessions (expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON taxiassur.auth_users, taxiassur.revoked_sessions TO taxiassur_app;
COMMIT;
