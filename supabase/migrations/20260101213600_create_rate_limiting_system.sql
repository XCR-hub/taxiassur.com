/*
  # Rate Limiting System

  1. New Tables
    - `rate_limit_attempts`
      - `id` (uuid, primary key)
      - `identifier` (text) - Client ID or IP
      - `action` (text) - Action type (lead_form, contact_form, etc.)
      - `created_at` (timestamptz)

    - `rate_limit_blocks`
      - `id` (uuid, primary key)
      - `identifier` (text) - Client ID or IP
      - `action` (text) - Action type
      - `blocked_until` (timestamptz)
      - `reason` (text)
      - `created_at` (timestamptz)

  2. Indexes
    - Fast lookups by identifier and action
    - Cleanup of old records

  3. Security
    - Enable RLS on both tables
    - Public can insert (for rate limit checks)
    - Service role can manage all records
*/

-- Create rate_limit_attempts table
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create rate_limit_blocks table
CREATE TABLE IF NOT EXISTS rate_limit_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  blocked_until timestamptz NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_identifier_action
  ON rate_limit_attempts(identifier, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_created_at
  ON rate_limit_attempts(created_at);

CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_identifier_action
  ON rate_limit_blocks(identifier, action, blocked_until);

CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_blocked_until
  ON rate_limit_blocks(blocked_until);

-- Enable RLS
ALTER TABLE rate_limit_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rate_limit_attempts
CREATE POLICY "Allow public insert for rate limiting"
  ON rate_limit_attempts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to attempts"
  ON rate_limit_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read for rate limit checks"
  ON rate_limit_attempts
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for rate_limit_blocks
CREATE POLICY "Allow public read blocks"
  ON rate_limit_blocks
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow service role full access to blocks"
  ON rate_limit_blocks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public insert blocks"
  ON rate_limit_blocks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Function to cleanup old rate limit attempts (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limit_attempts
  WHERE created_at < now() - interval '24 hours';

  DELETE FROM rate_limit_blocks
  WHERE blocked_until < now();

  RAISE NOTICE 'Cleaned up old rate limit records';
END;
$$;

-- Create a scheduled job to run cleanup daily
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 2 * * *',
  $$SELECT cleanup_old_rate_limit_attempts()$$
);