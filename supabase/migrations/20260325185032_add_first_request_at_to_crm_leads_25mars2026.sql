/*
  # Add first_request_at column to crm_leads

  1. New Columns
    - `first_request_at` (timestamptz) - The actual date of the first request/contact
      from this lead, based on the earliest email or form submission

  2. Data Population
    - For existing leads: set first_request_at to the earliest of:
      - The earliest email_messages.received_at linked to the lead
      - The existing created_at (as a fallback)
    - For new leads: defaults to now() (same as created_at)

  3. Why
    - Many leads were imported/migrated and their created_at reflects the import date
    - The actual first contact date is much earlier (visible in email history)
    - The pipeline needs to show when the prospect first reached out
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'first_request_at'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN first_request_at timestamptz;
  END IF;
END $$;

UPDATE crm_leads cl
SET first_request_at = COALESCE(
  (SELECT MIN(em.received_at)
   FROM email_messages em
   WHERE em.lead_id = cl.id
     AND em.received_at IS NOT NULL
     AND em.received_at < cl.created_at),
  cl.created_at
);

UPDATE crm_leads
SET first_request_at = created_at
WHERE first_request_at IS NULL;
