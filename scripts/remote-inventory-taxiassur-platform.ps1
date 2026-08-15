$ErrorActionPreference = 'Stop'
trap {
  ($_ | Out-String) | Set-Content -LiteralPath 'C:\Windows\Temp\taxiassur-platform-inventory-error.txt' -Encoding UTF8
  exit 1
}
$envFile = 'F:\TaxiAssur\Secrets\postgresql.env'
$psql = 'F:\TaxiAssur\PostgreSQL\runtime\pgsql\bin\psql.exe'
$report = 'C:\Windows\Temp\taxiassur-platform-inventory.json'

function Read-EnvFile([string]$Path) {
  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      $value = $Matches[2].Trim().Trim('"').Trim("'")
      $values[$Matches[1]] = $value
    }
  }
  return $values
}

$config = Read-EnvFile $envFile
$dbName = if ($config.TAXIASSUR_DB_NAME) { $config.TAXIASSUR_DB_NAME } elseif ($config.POSTGRES_DB) { $config.POSTGRES_DB } elseif ($config.PGDATABASE) { $config.PGDATABASE } else { 'taxiassur' }
$dbUser = if ($config.TAXIASSUR_DB_USER) { $config.TAXIASSUR_DB_USER } elseif ($config.POSTGRES_USER) { $config.POSTGRES_USER } elseif ($config.PGUSER) { $config.PGUSER } else { 'postgres' }
$dbPassword = if ($config.TAXIASSUR_DB_PASSWORD) { $config.TAXIASSUR_DB_PASSWORD } elseif ($config.POSTGRES_PASSWORD) { $config.POSTGRES_PASSWORD } elseif ($config.PGPASSWORD) { $config.PGPASSWORD } else { throw 'Database password missing' }
$env:PGPASSWORD = $dbPassword
$env:PGCLIENTENCODING = 'UTF8'

$sql = @'
SELECT jsonb_build_object(
  'database', current_database(),
  'server_version', current_setting('server_version'),
  'database_size_bytes', pg_database_size(current_database()),
  'schemas', (SELECT jsonb_agg(schema_name ORDER BY schema_name) FROM information_schema.schemata WHERE schema_name NOT LIKE 'pg_%' AND schema_name <> 'information_schema'),
  'extensions', (SELECT jsonb_agg(jsonb_build_object('name', extname, 'version', extversion) ORDER BY extname) FROM pg_extension),
  'relations', (
    SELECT jsonb_agg(jsonb_build_object('schema', schemaname, 'name', relname, 'kind', 'table', 'estimated_rows', n_live_tup) ORDER BY schemaname, relname)
    FROM pg_stat_user_tables
  ),
  'views', (SELECT jsonb_agg(jsonb_build_object('schema', schemaname, 'name', viewname) ORDER BY schemaname, viewname) FROM pg_views WHERE schemaname NOT LIKE 'pg_%' AND schemaname <> 'information_schema'),
  'functions', (SELECT count(*) FROM pg_proc JOIN pg_namespace n ON n.oid = pronamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'),
  'roles', (SELECT jsonb_agg(jsonb_build_object('name', rolname, 'login', rolcanlogin, 'superuser', rolsuper, 'createdb', rolcreatedb) ORDER BY rolname) FROM pg_roles)
)::text;
'@

$dbJson = & $psql -X -q -A -t -h 127.0.0.1 -p 5432 -U $dbUser -d $dbName -v ON_ERROR_STOP=1 -c $sql 2>&1
if ($LASTEXITCODE -ne 0) { throw "psql failed with exit code $LASTEXITCODE`: $($dbJson -join ' ')" }
$dbJson | Select-Object -Last 1 | Set-Content -LiteralPath $report -Encoding UTF8
