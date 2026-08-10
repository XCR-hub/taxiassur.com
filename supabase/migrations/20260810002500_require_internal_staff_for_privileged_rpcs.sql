-- Add an authorization guard inside privileged PL/pgSQL SECURITY DEFINER RPCs.
-- GRANT authenticated alone is insufficient because client/prospect auth users share
-- that database role. service_role remains available for trusted Edge Functions.
DO $migration$
DECLARE
  function_record record;
  function_definition text;
  guarded_definition text;
  guarded_names constant text[] := ARRAY[
    'get_ai_master_dashboard',
    'get_document_basket',
    'classify_attachment',
    'has_permission',
    'run_cron_job_now',
    'merge_two_leads_manual',
    'update_claim_tracking',
    'get_all_claims_for_admin',
    'safe_delete_lead',
    'create_down_payment_link',
    'get_unimported_email_attachments'
  ];
  service_only_names constant text[] := ARRAY[
    'sync_admin_user_by_email',
    'increment_social_network_posts'
  ];
  authorization_guard constant text := $guard$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT EXISTS (
       SELECT 1
       FROM public.admin_users internal_user
       WHERE internal_user.id = auth.uid()
         AND COALESCE(internal_user.is_active, true)
     ) THEN
    RAISE EXCEPTION 'Internal staff access required' USING ERRCODE = '42501';
  END IF;
$guard$;
BEGIN
  FOR function_record IN
    SELECT
      p.oid,
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language language ON language.oid = p.prolang
    WHERE n.nspname = 'public'
      AND language.lanname = 'plpgsql'
      AND p.prosecdef
      AND p.proname = ANY(guarded_names)
  LOOP
    function_definition := pg_get_functiondef(function_record.oid);
    IF function_definition NOT LIKE '%Internal staff access required%' THEN
      guarded_definition := regexp_replace(
        function_definition,
        E'\nBEGIN\n',
        E'\n' || authorization_guard,
        ''
      );
      IF guarded_definition = function_definition THEN
        RAISE EXCEPTION 'Unable to inject authorization guard into %.%(%)',
          function_record.schema_name,
          function_record.function_name,
          function_record.identity_arguments;
      END IF;
      EXECUTE guarded_definition;
    END IF;
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      function_record.schema_name,
      function_record.function_name,
      function_record.identity_arguments
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
      function_record.schema_name,
      function_record.function_name,
      function_record.identity_arguments
    );
  END LOOP;

  FOR function_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(service_only_names)
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      function_record.schema_name,
      function_record.function_name,
      function_record.identity_arguments
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      function_record.schema_name,
      function_record.function_name,
      function_record.identity_arguments
    );
  END LOOP;
END
$migration$;