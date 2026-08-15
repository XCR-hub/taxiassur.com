BEGIN;
CREATE SCHEMA IF NOT EXISTS taxiassur AUTHORIZATION taxiassur_app;
ALTER SCHEMA taxiassur OWNER TO taxiassur_app;

CREATE TABLE IF NOT EXISTS taxiassur.records (
  collection text NOT NULL CHECK (collection ~ '^[a-z][a-z0-9_]{0,62}$'),
  record_id text NOT NULL CHECK (length(record_id) BETWEEN 1 AND 200),
  data jsonb NOT NULL,
  origin text NOT NULL DEFAULT 'local',
  source_imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1,
  PRIMARY KEY (collection, record_id)
);
CREATE INDEX IF NOT EXISTS records_data_gin_idx ON taxiassur.records USING gin (data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS records_updated_at_idx ON taxiassur.records (collection, updated_at DESC);
CREATE INDEX IF NOT EXISTS records_lead_access_token_idx ON taxiassur.records ((data ->> 'access_token')) WHERE collection = 'crm_leads' AND data ? 'access_token';
CREATE INDEX IF NOT EXISTS records_lead_email_idx ON taxiassur.records (lower(data ->> 'email')) WHERE collection = 'crm_leads' AND data ? 'email';
CREATE INDEX IF NOT EXISTS records_document_lead_idx ON taxiassur.records ((data ->> 'lead_id'), (data ->> 'uploaded_at') DESC) WHERE collection = 'prospect_documents';

CREATE TABLE IF NOT EXISTS taxiassur.file_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('prospect', 'client', 'crm', 'system')),
  owner_id text NOT NULL,
  document_type text NOT NULL,
  original_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
  sha256_hex text NOT NULL CHECK (sha256_hex ~ '^[0-9a-f]{64}$'),
  scan_status text NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'infected', 'error')),
  scan_engine text,
  scan_checked_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected', 'quarantined')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS file_objects_owner_idx ON taxiassur.file_objects (owner_type, owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS taxiassur.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('admin', 'client', 'prospect')),
  subject_id text NOT NULL,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_subject_idx ON taxiassur.sessions (subject_type, subject_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS taxiassur.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_type text NOT NULL,
  actor_id text,
  action text NOT NULL,
  target_type text,
  target_id text,
  request_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_target_idx ON taxiassur.audit_events (target_type, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS taxiassur.outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text NOT NULL, aggregate_type text NOT NULL,
  aggregate_id text NOT NULL, payload jsonb NOT NULL, idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'delivery_uncertain')),
  attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
  processing_started_at timestamptz, completed_at timestamptz, last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_claim_idx ON taxiassur.outbox (status, next_attempt_at) WHERE status IN ('pending', 'failed');
CREATE TABLE IF NOT EXISTS taxiassur.migration_state (migration_key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());

DO $migration$
DECLARE source record;
BEGIN
  FOR source IN
    SELECT table_name AS tablename
    FROM information_schema.columns
    WHERE table_schema = 'supabase_rest' AND column_name = 'data' AND data_type = 'jsonb'
    ORDER BY table_name
  LOOP
    EXECUTE format(
      'INSERT INTO taxiassur.records (collection, record_id, data, origin, source_imported_at, created_at, updated_at)
       SELECT %L, COALESCE(NULLIF(data ->> ''id'', ''''), NULLIF(data ->> ''slug'', ''''), _import_row::text), data,
              ''supabase-import'', imported_at, COALESCE(imported_at, now()), COALESCE(imported_at, now())
       FROM supabase_rest.%I WHERE data IS NOT NULL ON CONFLICT (collection, record_id) DO NOTHING',
      source.tablename, source.tablename
    );
  END LOOP;
END $migration$;

INSERT INTO taxiassur.migration_state (migration_key, value)
VALUES ('001_local_platform_foundation', jsonb_build_object('applied_at', now(), 'source_schema', 'supabase_rest', 'collections', (SELECT count(DISTINCT collection) FROM taxiassur.records), 'records', (SELECT count(*) FROM taxiassur.records)))
ON CONFLICT (migration_key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

ALTER TABLE taxiassur.records OWNER TO taxiassur_app;
ALTER TABLE taxiassur.file_objects OWNER TO taxiassur_app;
ALTER TABLE taxiassur.sessions OWNER TO taxiassur_app;
ALTER TABLE taxiassur.audit_events OWNER TO taxiassur_app;
ALTER TABLE taxiassur.outbox OWNER TO taxiassur_app;
ALTER TABLE taxiassur.migration_state OWNER TO taxiassur_app;
GRANT USAGE ON SCHEMA taxiassur TO taxiassur_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA taxiassur TO taxiassur_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA taxiassur TO taxiassur_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA taxiassur GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO taxiassur_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA taxiassur GRANT USAGE, SELECT ON SEQUENCES TO taxiassur_app;
COMMIT;
