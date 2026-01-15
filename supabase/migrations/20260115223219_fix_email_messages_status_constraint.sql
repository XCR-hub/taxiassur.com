/*
  # Fix email_messages status constraint
  
  1. Changes
    - Add 'received' to the allowed status values
    - This allows IMAP sync to mark emails as received
    
  2. Security
    - No changes to RLS policies
*/

-- Drop old constraint
ALTER TABLE email_messages DROP CONSTRAINT IF EXISTS email_messages_status_check;

-- Add new constraint with 'received' value
ALTER TABLE email_messages ADD CONSTRAINT email_messages_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'received'::text, 'processed'::text, 'failed'::text, 'ignored'::text]));
