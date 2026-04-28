/*
  # Add quote_options and enrollment_fee to lead_company_quotes

  1. New Columns
    - `quote_options` (jsonb, default '{}') — stores company-specific options
      (e.g. Solly Azar: amenagements, bagages, equipements_pro_niveau, etc.)
    - `enrollment_fee` (numeric, default 0) — frais d'adhésion modifiable

  2. Notes
    - JSONB lets us add company-specific options without schema changes per company.
    - Default 0 for enrollment_fee matches Solly Azar default.
    - No RLS changes (existing policies cover these new columns).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_company_quotes' AND column_name = 'quote_options'
  ) THEN
    ALTER TABLE lead_company_quotes ADD COLUMN quote_options jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_company_quotes' AND column_name = 'enrollment_fee'
  ) THEN
    ALTER TABLE lead_company_quotes ADD COLUMN enrollment_fee numeric DEFAULT 0;
  END IF;
END $$;
