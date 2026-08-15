$ErrorActionPreference = 'Stop'
trap { ($_ | Out-String) | Set-Content 'C:\Windows\Temp\taxiassur-core-schema-error.txt' -Encoding UTF8; exit 1 }

function Read-EnvFile([string]$Path) {
  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      $values[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
  }
  return $values
}

$config = Read-EnvFile 'F:\TaxiAssur\Secrets\postgresql.env'
$env:PGPASSWORD = $config.POSTGRES_PASSWORD
$env:PGCLIENTENCODING = 'UTF8'
$psql = 'F:\TaxiAssur\PostgreSQL\runtime\pgsql\bin\psql.exe'
$tables = "'crm_leads','prospect_documents','crm_document_requests','monetico_payments','client_portal_users','admin_users','crm_interactions'"
$sql = @"
SELECT jsonb_build_object(
  'app_privileges', jsonb_build_object(
    'schema_usage', has_schema_privilege('taxiassur_app', 'supabase_rest', 'USAGE'),
    'schema_create', has_schema_privilege('taxiassur_app', 'supabase_rest', 'CREATE'),
    'crm_leads_select', has_table_privilege('taxiassur_app', 'supabase_rest.crm_leads', 'SELECT'),
    'crm_leads_update', has_table_privilege('taxiassur_app', 'supabase_rest.crm_leads', 'UPDATE'),
    'prospect_documents_select', has_table_privilege('taxiassur_app', 'supabase_rest.prospect_documents', 'SELECT'),
    'prospect_documents_insert', has_table_privilege('taxiassur_app', 'supabase_rest.prospect_documents', 'INSERT'),
    'prospect_documents_update', has_table_privilege('taxiassur_app', 'supabase_rest.prospect_documents', 'UPDATE')
  ),
  'columns', (
    SELECT jsonb_agg(jsonb_build_object('table', table_name, 'column', column_name, 'type', data_type, 'nullable', is_nullable) ORDER BY table_name, ordinal_position)
    FROM information_schema.columns WHERE table_schema = 'supabase_rest' AND table_name IN ($tables)
  ),
  'indexes', (
    SELECT jsonb_agg(jsonb_build_object('table', tablename, 'name', indexname, 'definition', indexdef) ORDER BY tablename, indexname)
    FROM pg_indexes WHERE schemaname = 'supabase_rest' AND tablename IN ($tables)
  ),
  'json_keys', (
    SELECT jsonb_object_agg(table_name, keys) FROM (
      SELECT 'crm_leads' table_name, (SELECT jsonb_agg(DISTINCT key ORDER BY key) FROM supabase_rest.crm_leads, LATERAL jsonb_object_keys(data) key) keys
      UNION ALL SELECT 'prospect_documents', (SELECT jsonb_agg(DISTINCT key ORDER BY key) FROM supabase_rest.prospect_documents, LATERAL jsonb_object_keys(data) key)
      UNION ALL SELECT 'crm_document_requests', (SELECT jsonb_agg(DISTINCT key ORDER BY key) FROM supabase_rest.crm_document_requests, LATERAL jsonb_object_keys(data) key)
      UNION ALL SELECT 'monetico_payments', (SELECT jsonb_agg(DISTINCT key ORDER BY key) FROM supabase_rest.monetico_payments, LATERAL jsonb_object_keys(data) key)
      UNION ALL SELECT 'client_portal_users', (SELECT jsonb_agg(DISTINCT key ORDER BY key) FROM supabase_rest.client_portal_users, LATERAL jsonb_object_keys(data) key)
      UNION ALL SELECT 'admin_users', (SELECT jsonb_agg(DISTINCT key ORDER BY key) FROM supabase_rest.admin_users, LATERAL jsonb_object_keys(data) key)
      UNION ALL SELECT 'crm_interactions', (SELECT jsonb_agg(DISTINCT key ORDER BY key) FROM supabase_rest.crm_interactions, LATERAL jsonb_object_keys(data) key)
    ) keysets
  ),
  'functions', (
    SELECT jsonb_agg(jsonb_build_object('schema', n.nspname, 'name', p.proname, 'arguments', pg_get_function_identity_arguments(p.oid), 'result', pg_get_function_result(p.oid)) ORDER BY n.nspname, p.proname)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public','supabase_rest')
  )
)::text;
"@
$result = & $psql -X -q -A -t -h 127.0.0.1 -p 5432 -U $config.POSTGRES_USER -d $config.POSTGRES_DB -v ON_ERROR_STOP=1 -c $sql 2>&1
if ($LASTEXITCODE -ne 0) { throw "psql failed: $($result -join ' ')" }
$result | Select-Object -Last 1 | Set-Content 'C:\Windows\Temp\taxiassur-core-schema.json' -Encoding UTF8
