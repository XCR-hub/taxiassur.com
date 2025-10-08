/*
  # Trend Analysis System Tables

  1. New Tables
    - `content_opportunities`
      - `id` (uuid, primary key)
      - `keyword` (text, unique)
      - `priority` (enum: high, medium, low)
      - `search_volume` (integer)
      - `competition` (text)
      - `trend` (text: rising, stable, falling)
      - `suggested_title` (text)
      - `suggested_questions` (text[])
      - `estimated_traffic` (integer)
      - `difficulty` (integer 1-10)
      - `analyzed_at` (timestamptz)
      - `used_for_content` (boolean)
      - `created_at` (timestamptz)

    - `search_console_data`
      - `id` (uuid, primary key)
      - `date` (date)
      - `metrics` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Authenticated users can read/write
*/

-- Create enum type for priority
DO $$ BEGIN
  CREATE TYPE opportunity_priority AS ENUM ('high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Content Opportunities Table
CREATE TABLE IF NOT EXISTS content_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text UNIQUE NOT NULL,
  priority opportunity_priority DEFAULT 'medium',
  search_volume integer DEFAULT 0,
  competition text,
  trend text,
  suggested_title text,
  suggested_questions text[] DEFAULT '{}',
  estimated_traffic integer DEFAULT 0,
  difficulty integer CHECK (difficulty >= 1 AND difficulty <= 10),
  analyzed_at timestamptz DEFAULT now(),
  used_for_content boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Search Console Data Table
CREATE TABLE IF NOT EXISTS search_console_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  metrics jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE content_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_console_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_opportunities
CREATE POLICY "Authenticated users can manage content opportunities"
  ON content_opportunities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for search_console_data
CREATE POLICY "Authenticated users can manage search console data"
  ON search_console_data FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_opportunities_priority ON content_opportunities(priority);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_trend ON content_opportunities(trend);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_used ON content_opportunities(used_for_content);
CREATE INDEX IF NOT EXISTS idx_content_opportunities_traffic ON content_opportunities(estimated_traffic DESC);
CREATE INDEX IF NOT EXISTS idx_search_console_date ON search_console_data(date DESC);
