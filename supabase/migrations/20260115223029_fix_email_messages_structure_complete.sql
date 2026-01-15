/*
  # Fix email_messages table structure for IMAP sync
  
  1. Changes
    - Add `account_id` column to link emails to email accounts
    - Make `imap_uid` nullable (not all emails have IMAP UIDs)
    - Make `to_email` nullable (we use `to_emails` array instead)
    - Add missing indexes for performance
    - Add RLS policy for service_role inserts
    
  2. Security
    - Keep existing RLS for admins
    - Add bypass for service_role (Edge Functions)
*/

-- Add account_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_messages' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE email_messages ADD COLUMN account_id uuid REFERENCES email_accounts(id);
  END IF;
END $$;

-- Make imap_uid nullable
ALTER TABLE email_messages ALTER COLUMN imap_uid DROP NOT NULL;

-- Make to_email nullable (we use to_emails array)
ALTER TABLE email_messages ALTER COLUMN to_email DROP NOT NULL;

-- Create index on account_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_email_messages_account_id ON email_messages(account_id);

-- Create index on message_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON email_messages(message_id);

-- Create index on received_at for sorting
CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON email_messages(received_at DESC);

-- Create index on lead_id for faster lead association
CREATE INDEX IF NOT EXISTS idx_email_messages_lead_id ON email_messages(lead_id) WHERE lead_id IS NOT NULL;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage email messages" ON email_messages;

-- Create comprehensive RLS policies
CREATE POLICY "Service role can insert email messages"
  ON email_messages
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read email messages"
  ON email_messages
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update email messages"
  ON email_messages
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Authenticated admins can read email messages"
  ON email_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can update email messages"
  ON email_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can insert email messages"
  ON email_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
