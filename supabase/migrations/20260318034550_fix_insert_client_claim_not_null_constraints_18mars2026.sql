/*
  # Fix insert_client_claim not-null constraint violations

  ## Problem
  The `insert_client_claim` RPC function fails with error code 23502 because
  `crm_claims` has NOT NULL constraints on `client_id`, `contract_id`, and
  `claim_number`, but the function does not supply these values (they are not
  known at claim declaration time from the client portal).

  ## Changes
  1. Make `client_id`, `contract_id`, and `claim_number` nullable
  2. Add a default auto-generated value for `claim_number` so it is never empty
     when inserted without an explicit value
  3. No data is dropped or altered — this is a constraint relaxation only
*/

-- Make client_id nullable (client portal identifies via lead_id instead)
ALTER TABLE crm_claims
  ALTER COLUMN client_id DROP NOT NULL;

-- Make contract_id nullable (may not be known at declaration time)
ALTER TABLE crm_claims
  ALTER COLUMN contract_id DROP NOT NULL;

-- Make claim_number nullable but add a generated default for new rows
ALTER TABLE crm_claims
  ALTER COLUMN claim_number DROP NOT NULL,
  ALTER COLUMN claim_number SET DEFAULT ('SIN-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8));
