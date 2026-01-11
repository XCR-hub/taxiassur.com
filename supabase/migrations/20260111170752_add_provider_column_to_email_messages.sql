/*
  # Add provider column to email_messages
  
  1. Changes
    - Add provider column to track email source (ionos-imap, brevo, etc.)
    - Add status column for email status tracking
    - Add channel column for communication channel
*/

-- Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_messages' AND column_name = 'provider'
  ) THEN
    ALTER TABLE email_messages ADD COLUMN provider text DEFAULT 'unknown';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_messages' AND column_name = 'status'
  ) THEN
    ALTER TABLE email_messages ADD COLUMN status text DEFAULT 'received';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_messages' AND column_name = 'channel'
  ) THEN
    ALTER TABLE email_messages ADD COLUMN channel text DEFAULT 'email';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_messages' AND column_name = 'has_attachments'
  ) THEN
    ALTER TABLE email_messages ADD COLUMN has_attachments boolean DEFAULT false;
  END IF;
END $$;

-- Create index on provider for filtering
CREATE INDEX IF NOT EXISTS idx_email_messages_provider ON email_messages(provider);
CREATE INDEX IF NOT EXISTS idx_email_messages_status ON email_messages(status);