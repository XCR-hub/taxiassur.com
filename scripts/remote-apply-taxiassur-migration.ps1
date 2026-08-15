param(
  [Parameter(Mandatory = $true)][string]$MigrationPath,
  [string]$ReportPath = 'C:\Windows\Temp\taxiassur-migration-result.json'
)
$ErrorActionPreference = 'Stop'
$started = Get-Date
$result = [ordered]@{ ok = $false; migration = $MigrationPath; started_at = $started.ToString('o'); completed_at = $null; error = $null }
try {
  $config = @{}
  foreach ($line in Get-Content 'F:\TaxiAssur\Secrets\postgresql.env') {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') { $config[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'") }
  }
  $env:PGPASSWORD = $config.POSTGRES_PASSWORD
  $env:PGCLIENTENCODING = 'UTF8'
  $psql = 'F:\TaxiAssur\PostgreSQL\runtime\pgsql\bin\psql.exe'
  $output = & $psql -X -q -h 127.0.0.1 -p 5432 -U $config.POSTGRES_USER -d $config.POSTGRES_DB -v ON_ERROR_STOP=1 -f $MigrationPath 2>&1
  if ($LASTEXITCODE -ne 0) { throw "psql exit $LASTEXITCODE`: $($output -join ' ')" }
  $result.ok = $true
} catch {
  $result.error = $_.Exception.Message
}
$result.completed_at = (Get-Date).ToString('o')
$result.duration_seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 2)
$result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
