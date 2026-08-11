-- Remove historical public execution rights from internal SECURITY DEFINER RPCs.
-- PostgreSQL grants EXECUTE to PUBLIC by default on new functions, so cover every
-- existing overload by identity arguments rather than relying on old signatures.
DO $migration$
DECLARE
  function_record record;
  service_only_names constant text[] := ARRAY[
    'record_ai_decision',
    'update_performance_metrics',
    'select_optimal_email_provider',
    'increment_provider_counters',
    'get_claims_stats',
    'get_email_sync_cron_status',
    'get_auto_sync_status',
    'send_document_notification_immediately',
    'get_lead_documents'
  ];
  backoffice_names constant text[] := ARRAY[
    'get_ai_master_dashboard',
    'get_document_basket',
    'classify_attachment',
    'has_permission'
  ];
BEGIN
  FOR function_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_arguments
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(service_only_names || backoffice_names)
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      function_record.schema_name,
      function_record.function_name,
      function_record.identity_arguments
    );

    IF function_record.function_name = ANY(service_only_names) THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %I.%I(%s) FROM authenticated',
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
    ELSE
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
        function_record.schema_name,
        function_record.function_name,
        function_record.identity_arguments
      );
    END IF;
  END LOOP;
END
$migration$;