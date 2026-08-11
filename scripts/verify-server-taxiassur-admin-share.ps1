param(
  [string]$Server = '192.168.1.70',
  [int]$MaxSyncAgeHours = 4,
  [int64]$MinBackupBytes = 10485760,
  [string]$ReportPath = "$env:USERPROFILE\taxiassur-server-admin-share-status.json"
)
$ErrorActionPreference = 'Stop'
$root = "\\$Server\F$\TaxiAssur"
$checks = [System.Collections.Generic.List[object]]::new()
function Add-Check([string]$Name, [bool]$Ok, $Details) {
  $checks.Add([pscustomobject]@{ name = $Name; ok = $Ok; details = $Details }) | Out-Null
}
function Age-Hours($Value) {
  if (-not $Value) { return $null }
  return [math]::Round(([DateTimeOffset]::Now - [DateTimeOffset]::Parse([string]$Value)).TotalHours, 2)
}

$rootExists = Test-Path -LiteralPath $root
Add-Check 'TaxiAssur root is reachable over F$' $rootExists @{ path = $root }
if (-not $rootExists) { throw "TaxiAssur server root unavailable: $root" }
foreach ($name in @('Api','Backups','Logs','PostgreSQL','Scripts','Secrets')) {
  $candidate = Join-Path $root $name
  Add-Check "server directory exists: $name" (Test-Path -LiteralPath $candidate) @{ path = $candidate }
}

$syncPath = Join-Path $root 'Logs\supabase-postgres-sync-latest.json'
$sync = $null
try { $sync = Get-Content -Raw -Encoding UTF8 -LiteralPath $syncPath | ConvertFrom-Json } catch { }
Add-Check 'latest PostgreSQL sync report parses' ($null -ne $sync) @{ path = $syncPath }
if ($sync) {
  $syncAge = Age-Hours $sync.finished_at
  Add-Check 'latest PostgreSQL sync status is ok' ($sync.status -eq 'ok') @{ status = $sync.status }
  Add-Check 'all configured tables synchronized' ([int]$sync.totals.tables -gt 0 -and [int]$sync.totals.ok -eq [int]$sync.totals.tables) @{ tables = $sync.totals.tables; ok = $sync.totals.ok }
  Add-Check 'no synchronized table failed' ([int]$sync.totals.failed -eq 0 -and @($sync.failures).Count -eq 0) @{ failed = $sync.totals.failed; failures = @($sync.failures).Count }
  Add-Check 'synchronization imported rows' ([int64]$sync.totals.rows -gt 0) @{ rows = $sync.totals.rows }
  Add-Check 'synchronization has no invalid JSON' ([int64]$sync.totals.invalid_json_rows -eq 0) @{ invalid_json_rows = $sync.totals.invalid_json_rows }
  Add-Check 'synchronization report is fresh' ($null -ne $syncAge -and $syncAge -le $MaxSyncAgeHours) @{ age_hours = $syncAge; maximum_hours = $MaxSyncAgeHours }
}

$backupRoot = Join-Path $root 'Backups\PostgreSQL'
$backup = Get-ChildItem -LiteralPath $backupRoot -Filter 'taxiassur_*.dump' -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$backupAge = if ($backup) { [math]::Round(((Get-Date) - $backup.LastWriteTime).TotalHours, 2) } else { $null }
Add-Check 'latest PostgreSQL backup exists' ($null -ne $backup) @{ name = $backup.Name }
Add-Check 'latest PostgreSQL backup is non-trivial' ($backup -and $backup.Length -ge $MinBackupBytes) @{ bytes = $backup.Length; minimum_bytes = $MinBackupBytes }
Add-Check 'latest PostgreSQL backup is fresh' ($backup -and $backupAge -le $MaxSyncAgeHours) @{ age_hours = $backupAge; maximum_hours = $MaxSyncAgeHours }

$serviceOutput = (& sc.exe "\\$Server" query TaxiAssurPostgreSQL17 2>&1 | Out-String)
Add-Check 'TaxiAssur PostgreSQL service is running' ($LASTEXITCODE -eq 0 -and $serviceOutput -match 'STATE\s*:\s*4\s+RUNNING') @{ service = 'TaxiAssurPostgreSQL17' }
$taskOutput = (& schtasks.exe /Query /S $Server /TN 'TaxiAssur SMS API' /V /FO LIST 2>&1 | Out-String)
Add-Check 'TaxiAssur SMS scheduled task is running' ($LASTEXITCODE -eq 0 -and $taskOutput -match '267009|En cours|Running') @{ task = 'TaxiAssur SMS API' }

$localSms = Join-Path (Split-Path -Parent $PSScriptRoot) 'server\sms-api.mjs'
$remoteSms = Join-Path $root 'Api\sms-api.mjs'
$localHash = if (Test-Path -LiteralPath $localSms) { (Get-FileHash -Algorithm SHA256 -LiteralPath $localSms).Hash } else { $null }
$remoteHash = if (Test-Path -LiteralPath $remoteSms) { (Get-FileHash -Algorithm SHA256 -LiteralPath $remoteSms).Hash } else { $null }
Add-Check 'server SMS API matches local hardened source' ($localHash -and $localHash -eq $remoteHash) @{ local_hash = $localHash; remote_hash = $remoteHash }

$envPath = Join-Path $root 'Secrets\taxiassur-sms-api.env'
$envValues = @{}
if (Test-Path -LiteralPath $envPath) {
  foreach ($line in Get-Content -Encoding UTF8 -LiteralPath $envPath) {
    $separator = $line.IndexOf('=')
    if ($separator -gt 0) { $envValues[$line.Substring(0, $separator)] = $line.Substring($separator + 1) }
  }
}
Add-Check 'SMS API is loopback-only' ($envValues['TAXIASSUR_SMS_API_HOST'] -eq '127.0.0.1') @{ host = $envValues['TAXIASSUR_SMS_API_HOST']; port = $envValues['TAXIASSUR_SMS_API_PORT'] }
Add-Check 'SMS API authentication token is configured' (([string]$envValues['TAXIASSUR_SMS_API_TOKEN']).Length -ge 32) @{ token_configured = [bool]$envValues['TAXIASSUR_SMS_API_TOKEN']; token_length = ([string]$envValues['TAXIASSUR_SMS_API_TOKEN']).Length }
$enabled = $envValues['TAXIASSUR_SMS_ENABLED'] -eq 'true'
$providerConfigured = -not [string]::IsNullOrWhiteSpace([string]$envValues['BREVO_API_KEY'])
Add-Check 'SMS enabled state is consistent with provider key' ($enabled -eq $providerConfigured) @{ enabled = $enabled; provider_configured = $providerConfigured }

$failed = @($checks | Where-Object { -not $_.ok })
$report = [ordered]@{ ok = $failed.Count -eq 0; server = $Server; checked_at = (Get-Date).ToString('o'); checks = $checks }
[System.IO.File]::WriteAllText($ReportPath, (($report | ConvertTo-Json -Depth 8) + "`n"), [System.Text.UTF8Encoding]::new($false))
foreach ($check in $checks) { Write-Host ("{0} - {1}" -f $(if ($check.ok) {'OK '} else {'ERR'}), $check.name) }
Write-Host "Report: $ReportPath"
if ($failed.Count) { exit 1 }