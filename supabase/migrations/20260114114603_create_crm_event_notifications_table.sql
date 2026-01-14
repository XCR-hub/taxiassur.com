/*
  # Create CRM Event Notifications Table

  1. New Tables
    - `crm_event_notifications`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key to crm_leads)
      - `event_type` (text)
      - `message` (text)
      - `priority` (integer) - 10 for high, 5 for normal, 1 for low
      - `context_data` (jsonb)
      - `is_read` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `crm_event_notifications` table
    - Add policy for authenticated users to read their notifications
*/

CREATE TABLE IF NOT EXISTS crm_event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  context_data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_event_notifications_lead_id ON crm_event_notifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_event_notifications_created_at ON crm_event_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_event_notifications_priority ON crm_event_notifications(priority DESC);
CREATE INDEX IF NOT EXISTS idx_crm_event_notifications_is_read ON crm_event_notifications(is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE crm_event_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read all notifications
CREATE POLICY "Authenticated users can view notifications"
  ON crm_event_notifications FOR SELECT
  TO authenticated
  USING (true);

-- Policy for authenticated users to update notifications (mark as read)
CREATE POLICY "Authenticated users can update notifications"
  ON crm_event_notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for system to insert notifications
CREATE POLICY "System can insert notifications"
  ON crm_event_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);