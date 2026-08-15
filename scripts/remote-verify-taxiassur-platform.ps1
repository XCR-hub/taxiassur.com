$ErrorActionPreference = 'Stop'
trap { ($_ | Out-String) | Set-Content 'C:\Windows\Temp\taxiassur-platform-verification-error.txt' -Encoding UTF8; exit 1 }
$config = @{}
foreach ($line in Get-Content 'F:\TaxiAssur\Secrets\postgresql.env') {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') { $config[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'") }
}
$env:PGPASSWORD = $config.TAXIASSUR_APP_PASSWORD
$env:PGCLIENTENCODING = 'UTF8'
$psql = 'F:\TaxiAssur\PostgreSQL\runtime\pgsql\bin\psql.exe'
$sql = @'
BEGIN;
INSERT INTO taxiassur.audit_events (actor_type, action) VALUES ('system', 'platform_verification');
SELECT jsonb_build_object(
  'records', (SELECT count(*) FROM taxiassur.records),
  'collections', (SELECT count(DISTINCT collection) FROM taxiassur.records),
  'crm_leads', (SELECT count(*) FROM taxiassur.records WHERE collection = 'crm_leads'),
  'prospect_documents', (SELECT count(*) FROM taxiassur.records WHERE collection = 'prospect_documents'),
  'admin_users', (SELECT count(*) FROM taxiassur.records WHERE collection = 'admin_users'),
  'files', (SELECT count(*) FROM taxiassur.file_objects),
  'migration', (SELECT value FROM taxiassur.migration_state WHERE migration_key = '001_local_platform_foundation'),
  'app_can_write', true
)::text;
ROLLBACK;
'@
$output = & $psql -X -q -A -t -h 127.0.0.1 -p 5432 -U $config.TAXIASSUR_APP_USER -d $config.POSTGRES_DB -v ON_ERROR_STOP=1 -c $sql 2>&1
if ($LASTEXITCODE -ne 0) { throw "verification failed: $($output -join ' ')" }
$output | Where-Object { $_ -match '^\{' } | Select-Object -Last 1 | Set-Content 'C:\Windows\Temp\taxiassur-platform-verification.json' -Encoding UTF8
