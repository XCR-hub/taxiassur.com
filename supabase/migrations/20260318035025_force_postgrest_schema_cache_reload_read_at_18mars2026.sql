/*
  # Force PostgREST schema cache reload for crm_event_notifications.read_at

  ## Problem
  The `read_at` column was added to `crm_event_notifications` but PostgREST's
  schema cache still returns error 42703 ("column does not exist").
  This migration forces the cache to reload by sending a NOTIFY signal.

  ## Changes
  - NOTIFY pgrst to reload the schema cache
  - Re-confirm the column exists with a safe no-op ALTER (adds default only if missing)
*/

-- Ensure the column exists (safe idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_event_notifications'
      AND column_name = 'read_at'
  ) THEN
    ALTER TABLE crm_event_notifications
      ADD COLUMN read_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
