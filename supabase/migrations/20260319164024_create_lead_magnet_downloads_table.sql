/*
  # Lead Magnet Downloads Table

  ## Summary
  Creates a table to track email captures from downloadable guides and checklists.
  Users provide their email to access free resources (PDF guides), and these
  contacts are stored for follow-up marketing.

  ## New Tables
  - `lead_magnet_downloads`
    - `id` (uuid, primary key)
    - `email` (text, required) — email address provided by the user
    - `first_name` (text, optional) — first name for personalization
    - `guide_type` (text, required) — which guide was downloaded: 'guide-complet' or 'checklist-documents'
    - `source_page` (text, optional) — which page the download was triggered from
    - `created_at` (timestamptz) — when the download was requested

  ## Security
  - RLS enabled
  - Anon users can INSERT (to capture leads without login)
  - Authenticated admins can SELECT (to view captured leads in backoffice)
*/

CREATE TABLE IF NOT EXISTS lead_magnet_downloads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  first_name  text        DEFAULT '',
  guide_type  text        NOT NULL CHECK (guide_type IN ('guide-complet', 'checklist-documents')),
  source_page text        DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_magnet_email      ON lead_magnet_downloads (email);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_guide_type ON lead_magnet_downloads (guide_type);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_created_at ON lead_magnet_downloads (created_at DESC);

ALTER TABLE lead_magnet_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request a guide"
  ON lead_magnet_downloads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND length(trim(email)) > 0);

CREATE POLICY "Admins can view lead magnet downloads"
  ON lead_magnet_downloads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
