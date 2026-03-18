/*
  # Force PostgREST schema cache reload

  The read_at column exists in crm_event_notifications but PostgREST
  is serving a stale cache. This forces a reload.
*/

-- Ensure read_at column exists
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

-- Touch the table to bust PostgREST schema cache
COMMENT ON COLUMN crm_event_notifications.read_at IS 'Timestamp when this notification was read by the user';

-- Force PostgREST reload
NOTIFY pgrst, 'reload schema';
