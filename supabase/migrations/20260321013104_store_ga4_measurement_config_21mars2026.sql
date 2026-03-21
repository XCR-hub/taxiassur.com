/*
  # GA4 Measurement Configuration - 21 mars 2026

  ## Changes
  - Stores GA4 Measurement ID (G-EF69PNJBZE) in system_config
  - Stores GA4 Data Stream ID (14156578213) in system_config
  - Updates ga4-signals-sync-daily cron to run every 6h for fresher data
  - Adds a ga4_ai_recommendations table to persist AI SEO recommendations

  ## Tables
  - ga4_ai_recommendations: stores AI-generated SEO recommendations based on GA4 data

  ## Security
  - RLS enabled on ga4_ai_recommendations
  - Only authenticated users can read
  - Service role can write
*/

INSERT INTO system_config (key, value, description)
VALUES
  ('ga4_measurement_id',  'G-EF69PNJBZE',  'Google Analytics 4 Measurement ID (Tag ID)'),
  ('ga4_stream_id',       '14156578213',    'Google Analytics 4 Data Stream ID'),
  ('ga4_stream_name',     'TaxiAssur',      'Google Analytics 4 Stream Name'),
  ('ga4_stream_url',      'https://taxiassur.com', 'Google Analytics 4 Stream URL')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS ga4_ai_recommendations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path       text        NOT NULL,
  priority        text        NOT NULL CHECK (priority IN ('haute', 'moyenne', 'faible')),
  problem         text        NOT NULL,
  action          text        NOT NULL,
  expected_gain   text,
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'dismissed')),
  generated_at    timestamptz NOT NULL DEFAULT now(),
  applied_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ga4_ai_recs_page       ON ga4_ai_recommendations(page_path);
CREATE INDEX IF NOT EXISTS idx_ga4_ai_recs_priority   ON ga4_ai_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_ga4_ai_recs_status     ON ga4_ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ga4_ai_recs_generated  ON ga4_ai_recommendations(generated_at DESC);

ALTER TABLE ga4_ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read ga4 ai recommendations"
  ON ga4_ai_recommendations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role insert ga4 ai recommendations"
  ON ga4_ai_recommendations FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated update ga4 ai recommendations"
  ON ga4_ai_recommendations FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

DO $$
DECLARE
  v_url text;
  v_key text;
  v_cmd text;
BEGIN
  SELECT value INTO v_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO v_key FROM system_config WHERE key = 'supabase_service_role_key';

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE NOTICE 'system_config keys missing - skipping cron update';
    RETURN;
  END IF;

  PERFORM cron.unschedule('ga4-signals-sync-daily');

  v_cmd := 'SELECT net.http_post(' ||
           'url:=''' || v_url || '/functions/v1/sync-ga4-signals'',' ||
           'headers:=''{"Content-Type":"application/json","Authorization":"Bearer ' || v_key || '"}''::jsonb,' ||
           'body:=''{"days":30}''::jsonb)';

  PERFORM cron.schedule('ga4-signals-sync-6h', '0 */6 * * *', v_cmd);
  RAISE NOTICE 'Cron ga4-signals-sync-6h created (every 6 hours)';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Cron update skipped: %', SQLERRM;
END $$;
