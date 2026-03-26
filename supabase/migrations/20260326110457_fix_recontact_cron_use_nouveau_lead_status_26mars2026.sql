/*
  # Fix recontact auto-reactivation CRON function

  1. Changes
    - Fix `reactivate_scheduled_lost_leads` function to use correct status values
    - Look for leads with status `RECONTACT_PROGRAMME` (was `LOST_RECONTACT_SCHEDULED`)
    - Set reactivated lead status to `NOUVEAU_LEAD` (was `NEW_LEAD`)
    - Update index to match new status filter

  2. Important Notes
    - The old function referenced statuses that no longer exist in the current pipeline
    - This ensures leads in "Recontact Programme" are properly moved back to "Nouveau Lead" when the recontact date arrives
*/

CREATE OR REPLACE FUNCTION reactivate_scheduled_lost_leads()
RETURNS TABLE(reactivated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  lead_record RECORD;
  activated_count INTEGER := 0;
BEGIN
  FOR lead_record IN
    SELECT id, first_name, last_name, email, recontact_scheduled_date
    FROM crm_leads
    WHERE status = 'RECONTACT_PROGRAMME'
    AND recontact_scheduled_date IS NOT NULL
    AND recontact_scheduled_date <= CURRENT_DATE
    AND deleted_at IS NULL
  LOOP
    UPDATE crm_leads
    SET
      status = 'NOUVEAU_LEAD',
      recontact_attempts = COALESCE(recontact_attempts, 0) + 1,
      last_recontact_date = NOW(),
      updated_at = NOW()
    WHERE id = lead_record.id;

    INSERT INTO crm_timeline (lead_id, event_type, title, description, created_at)
    VALUES (
      lead_record.id,
      'status_change',
      'Reactivation automatique - Contact programme',
      format('Lead reactive automatiquement apres recontact programme le %s', lead_record.recontact_scheduled_date),
      NOW()
    );

    activated_count := activated_count + 1;
  END LOOP;

  RETURN QUERY SELECT activated_count;
END;
$$;

DROP INDEX IF EXISTS idx_crm_leads_recontact_scheduled;
CREATE INDEX IF NOT EXISTS idx_crm_leads_recontact_scheduled
ON crm_leads(recontact_scheduled_date, status)
WHERE status = 'RECONTACT_PROGRAMME' AND deleted_at IS NULL AND recontact_scheduled_date IS NOT NULL;

COMMENT ON FUNCTION reactivate_scheduled_lost_leads IS 'Reactive automatiquement les leads RECONTACT_PROGRAMME dont la date de recontact est atteinte vers NOUVEAU_LEAD';