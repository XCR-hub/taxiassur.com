/*
  # Fix safe_delete_lead - cascade delete all FK-dependent rows

  ## Problem
  The original safe_delete_lead function only deleted from 4 tables before
  deleting crm_leads. However, crm_leads has 100+ tables with FK constraints
  pointing to it, causing the DELETE to fail with a foreign key violation.

  ## Solution
  Rewrite safe_delete_lead to dynamically discover all tables that have a
  foreign key referencing crm_leads, delete those rows first, then delete
  the lead itself. This handles any future FK additions automatically.
*/

CREATE OR REPLACE FUNCTION safe_delete_lead(
  p_lead_id uuid,
  p_deletion_reason text DEFAULT 'admin_manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_data jsonb;
  v_table_name text;
  v_column_name text;
  v_rows_deleted int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès refusé - admins uniquement');
  END IF;

  SELECT jsonb_build_object(
    'id', id,
    'name', COALESCE(first_name || ' ' || last_name, email),
    'email', email,
    'phone', phone,
    'status', status,
    'pipeline_stage', pipeline_stage,
    'created_at', created_at
  )
  INTO v_lead_data
  FROM crm_leads WHERE id = p_lead_id;

  IF v_lead_data IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead introuvable');
  END IF;

  INSERT INTO lead_deletion_log (lead_id, lead_email, lead_name, deletion_reason, deleted_by, lead_data)
  VALUES (
    p_lead_id,
    v_lead_data->>'email',
    v_lead_data->>'name',
    p_deletion_reason,
    auth.uid(),
    v_lead_data
  );

  FOR v_table_name, v_column_name IN
    SELECT DISTINCT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.key_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = 'crm_leads'
    ORDER BY tc.table_name
  LOOP
    BEGIN
      EXECUTE format('DELETE FROM public.%I WHERE %I = $1', v_table_name, v_column_name)
        USING p_lead_id;
      GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  DELETE FROM crm_leads WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lead supprimé avec succès',
    'deleted_lead', v_lead_data
  );
END;
$$;

GRANT EXECUTE ON FUNCTION safe_delete_lead(uuid, text) TO authenticated;
