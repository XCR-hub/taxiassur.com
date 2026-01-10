/*
  # Add columns for email to lead sync

  1. New Columns
    - `to_names` - Array of recipient names
    - `auto_matched` - Boolean flag for automatic lead matching
    - Add index on lead_id for performance
    - Add index on from_email for lead matching
    
  2. Purpose
    - Support automatic email to lead assignment
    - Track auto-matched emails
    - Improve query performance
*/

-- Add to_names column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_messages' 
    AND column_name = 'to_names'
  ) THEN
    ALTER TABLE email_messages ADD COLUMN to_names text[];
  END IF;
END $$;

-- Ensure auto_matched column has default
ALTER TABLE email_messages 
  ALTER COLUMN auto_matched SET DEFAULT false;

-- Add performance indexes for lead matching
CREATE INDEX IF NOT EXISTS idx_email_messages_from_email 
  ON email_messages(from_email);

CREATE INDEX IF NOT EXISTS idx_email_messages_lead_id_null 
  ON email_messages(lead_id) WHERE lead_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_messages_received_at 
  ON email_messages(received_at DESC);

-- Add composite index for unassigned email queries
CREATE INDEX IF NOT EXISTS idx_email_messages_unassigned 
  ON email_messages(received_at DESC) WHERE lead_id IS NULL;

-- Add index for email direction queries
CREATE INDEX IF NOT EXISTS idx_email_messages_direction 
  ON email_messages(direction);
