/*
  # Add read_at column to crm_event_notifications

  ## Summary
  The client portal's notifications page uses `read_at` (timestamp) to track when
  a notification was read, enabling relative time display ("read 2h ago").
  The table currently only has `is_read` (boolean).

  1. Changes
    - Add `read_at` (timestamptz, nullable) to crm_event_notifications
    - Backfill: set read_at = created_at for existing rows where is_read = true

  2. Notes
    - Both `is_read` and `read_at` will coexist; `read_at` IS NULL means unread
    - Marking read sets both `is_read = true` AND `read_at = now()`
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_event_notifications' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE crm_event_notifications ADD COLUMN read_at timestamptz;
  END IF;
END $$;

UPDATE crm_event_notifications
SET read_at = created_at
WHERE is_read = true AND read_at IS NULL;
