/*
  # Deduplicate lead_company_quotes and prevent future duplicates

  1. Problem
    - Some leads have multiple `lead_company_quotes` rows for the same company,
      which inflates the "Validation Compagnies" progress counter (e.g. "0 / 11"
      instead of "0 / 5").
    - Cause: the auto-seed in `LeadCompanyQuotes.loadData` can run twice in
      parallel (component remount), inserting the same (lead_id, company_id) pair
      multiple times because no unique constraint exists.

  2. Changes
    - Deduplicate existing rows, keeping the most informative row per
      (lead_id, company_id): the one with a `quote_file_url`, otherwise the
      oldest. Duplicates are removed safely.
    - Add a partial unique index on (lead_id, company_id) so future races no
      longer create duplicates.

  3. Safety
    - Only redundant rows are deleted (those that share lead_id + company_id
      with a "winner"). No data loss for users who actually submitted quotes,
      because rows with `quote_file_url` are always preferred.
*/

WITH ranked AS (
  SELECT
    id,
    lead_id,
    company_id,
    quote_file_url,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY lead_id, company_id
      ORDER BY
        CASE WHEN quote_file_url IS NOT NULL AND quote_file_url <> '' THEN 0 ELSE 1 END,
        created_at ASC
    ) AS rn
  FROM lead_company_quotes
)
DELETE FROM lead_company_quotes
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS lead_company_quotes_lead_company_unique
  ON lead_company_quotes (lead_id, company_id);
