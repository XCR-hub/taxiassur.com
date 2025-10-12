/*
  # Create FAQ and City Pages Tables

  1. New Tables
    - `faq_entries`
      - `id` (uuid, primary key)
      - `question` (text, required)
      - `answer` (text, required)
      - `tags` (text array)
      - `status` (enum: draft, published)
      - `category` (text)
      - `order` (integer, for display order)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `city_pages`
      - `id` (uuid, primary key)
      - `city` (text, unique, required)
      - `title` (text, required)
      - `slug` (text, unique, required)
      - `content` (text, required)
      - `meta_description` (text)
      - `keywords` (text array)
      - `status` (enum: draft, published)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `published_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Allow anon to read published entries
    - Allow anon to insert/update (backoffice usage - temporary)
*/

-- Create faq_entries table
CREATE TABLE IF NOT EXISTS faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  tags text[] DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  category text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create city_pages table
CREATE TABLE IF NOT EXISTS city_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text UNIQUE NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  meta_description text,
  keywords text[] DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz
);

-- Enable RLS
ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_pages ENABLE ROW LEVEL SECURITY;

-- FAQ Policies
CREATE POLICY "Allow public read published faq"
  ON faq_entries FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "TEMP: Allow anon insert faq"
  ON faq_entries FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "TEMP: Allow anon update faq"
  ON faq_entries FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "TEMP: Allow anon delete faq"
  ON faq_entries FOR DELETE
  TO anon
  USING (true);

-- City Pages Policies
CREATE POLICY "Allow public read published cities"
  ON city_pages FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "TEMP: Allow anon insert cities"
  ON city_pages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "TEMP: Allow anon update cities"
  ON city_pages FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "TEMP: Allow anon delete cities"
  ON city_pages FOR DELETE
  TO anon
  USING (true);

-- Indexes for faq_entries
CREATE INDEX IF NOT EXISTS faq_entries_status_idx ON faq_entries(status);
CREATE INDEX IF NOT EXISTS faq_entries_category_idx ON faq_entries(category);
CREATE INDEX IF NOT EXISTS faq_entries_order_idx ON faq_entries(display_order);

-- Indexes for city_pages
CREATE INDEX IF NOT EXISTS city_pages_city_idx ON city_pages(city);
CREATE INDEX IF NOT EXISTS city_pages_slug_idx ON city_pages(slug);
CREATE INDEX IF NOT EXISTS city_pages_status_idx ON city_pages(status);

-- Triggers
CREATE OR REPLACE FUNCTION update_faq_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER faq_entries_updated_at_trigger
  BEFORE UPDATE ON faq_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_entries_updated_at();

CREATE OR REPLACE FUNCTION update_city_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'published' AND OLD.status = 'draft' THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER city_pages_updated_at_trigger
  BEFORE UPDATE ON city_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_city_pages_updated_at();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Tables faq_entries et city_pages créées';
  RAISE NOTICE '✅ RLS policies configurées (mode temporaire pour développement)';
END $$;
