/*
  # Create quote requests and contacts tables

  1. New Tables
    - `quote_requests`
      - `id` (uuid, primary key)
      - `company_name` (text, required) - Name of the solar panel installation company
      - `siret` (text, required) - Company SIRET number
      - `contact_name` (text, required) - Contact person full name
      - `email` (text, required) - Contact email address
      - `phone` (text, required) - Contact phone number
      - `annual_revenue` (numeric) - Annual company revenue
      - `years_experience` (integer) - Years of experience in solar installation
      - `employees_count` (integer) - Number of employees
      - `installation_types` (text[]) - Types of installations (residential, commercial, industrial)
      - `annual_installations` (integer) - Number of installations per year
      - `message` (text) - Additional message or requirements
      - `status` (text, default 'pending') - Request status
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `contact_messages`
      - `id` (uuid, primary key)
      - `name` (text, required) - Sender name
      - `email` (text, required) - Sender email
      - `phone` (text) - Optional phone number
      - `subject` (text, required) - Message subject
      - `message` (text, required) - Message content
      - `status` (text, default 'new') - Message status
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Add policies allowing public inserts (for form submissions)
    - Restrict reads to authenticated users only (for admin access)
*/

-- Create quote_requests table
CREATE TABLE IF NOT EXISTS quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  siret text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  annual_revenue numeric DEFAULT 0,
  years_experience integer DEFAULT 0,
  employees_count integer DEFAULT 0,
  installation_types text[] DEFAULT '{}',
  annual_installations integer DEFAULT 0,
  message text DEFAULT '',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Policies for quote_requests
CREATE POLICY "Anyone can submit a quote request"
  ON quote_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view quote requests"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update quote requests"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for contact_messages
CREATE POLICY "Anyone can submit a contact message"
  ON contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view contact messages"
  ON contact_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update contact messages"
  ON contact_messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to quote_requests
CREATE TRIGGER update_quote_requests_updated_at
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
