$ErrorActionPreference = "Stop"

$base = "F:\TaxiAssur"
$configFile = Join-Path $base "Secrets\supabase-sync.env"
$postgresSecretFile = Join-Path $base "Secrets\postgresql.env"
$tablesFile = Join-Path $base "Config\supabase-rest-tables.txt"
$seedTablesDir = Join-Path $base "Backups\supabase-rest-node-20260727-191255\tables"
$syncRoot = Join-Path $base "Backups\SupabaseRestSync"
$logsDir = Join-Path $base "Logs"
$workDir = Join-Path $base "ImportWork\supabase-rest-sync"
$reportLatest = Join-Path $logsDir "supabase-postgres-sync-latest.json"
$pgRoot = Join-Path $base "PostgreSQL\runtime\pgsql"
$script:psql = Join-Path $pgRoot "bin\psql.exe"
$backupScript = Join-Path $base "Scripts\backup-taxiassur-postgres.ps1"

function Add-Log([string]$message) {
  $stamp = Get-Date -Format "HH:mm:ss"
  Write-Host "[$stamp] $message"
}

function Read-EnvFile([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Fichier introuvable : $path" }
  $env = @{}
  foreach ($line in Get-Content -LiteralPath $path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
    $index = $trimmed.IndexOf('=')
    if ($index -lt 1) { continue }
    $key = $trimmed.Substring(0, $index).Trim()
    $value = $trimmed.Substring($index + 1).Trim()
    if ($value.Length -ge 2) {
      $first = $value[0]
      $last = $value[$value.Length - 1]
      if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }
    $env[$key] = $value
  }
  return $env
}

function Normalize-RestUrl([string]$value) {
  $trimmed = $value.Trim().TrimEnd('/')
  if ($trimmed.ToLowerInvariant().EndsWith('/rest/v1')) { return $trimmed }
  return "$trimmed/rest/v1"
}

function TimestampForPath() {
  return (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
}

function PgQuoteIdent([string]$value) {
  return '"' + $value.Replace('"', '""') + '"'
}

function PgQuoteLiteral([string]$value) {
  if ($null -eq $value) { return "NULL" }
  return "'" + $value.Replace("'", "''") + "'"
}

function Trim-CommandOutput($value) {
  return (($value) -join "`n").Trim()
}

function Get-StableTableName([string]$name) {
  $safe = $name.ToLowerInvariant() -replace '[^a-z0-9_]', '_'
  $safe = $safe -replace '_+', '_'
  $safe = $safe.Trim('_')
  if ([string]::IsNullOrWhiteSpace($safe)) { $safe = 'table' }
  if ($safe -match '^[0-9]') { $safe = 't_' + $safe }
  if ($safe.Length -gt 54) {
    $sha = [System.Security.Cryptography.SHA1]::Create()
    try {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($name)
      $hash = [System.BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').Substring(0, 8).ToLowerInvariant()
    } finally {
      $sha.Dispose()
    }
    $safe = $safe.Substring(0, 54) + '_' + $hash
  }
  return $safe
}

function Run-PsqlScalar([string]$sql) {
  $output = & $script:psql -h 127.0.0.1 -p 5432 -U postgres -d taxiassur -tAc $sql 2>&1
  if ($LASTEXITCODE -ne 0) { throw "psql scalar failed ($LASTEXITCODE): $($output -join ' | ')" }
  return (Trim-CommandOutput $output)
}

function Run-PsqlCommand([string]$sql) {
  $output = & $script:psql -h 127.0.0.1 -p 5432 -U postgres -d taxiassur -v ON_ERROR_STOP=1 -q -X -c $sql 2>$null
  if ($LASTEXITCODE -ne 0) { throw "psql command failed ($LASTEXITCODE): $($output -join ' | ')" }
  return (Trim-CommandOutput $output)
}

function Run-PsqlFile([string]$sqlFile) {
  $output = & $script:psql -h 127.0.0.1 -p 5432 -U postgres -d taxiassur -v ON_ERROR_STOP=1 -q -X -f $sqlFile 2>$null
  if ($LASTEXITCODE -ne 0) { throw "psql file failed ($LASTEXITCODE): $($output -join ' | ')" }
  return (Trim-CommandOutput $output)
}

function Get-TableList() {
  if (Test-Path -LiteralPath $tablesFile) {
    return @(Get-Content -LiteralPath $tablesFile | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  }
  if (-not (Test-Path -LiteralPath $seedTablesDir)) { throw "Aucune liste de tables et dossier source introuvable : $seedTablesDir" }
  $tables = @(Get-ChildItem -LiteralPath $seedTablesDir -Filter '*.jsonl' -File | Sort-Object Name | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_.Name) })
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $tablesFile) | Out-Null
  Set-Content -LiteralPath $tablesFile -Value $tables -Encoding ASCII
  return $tables
}

function Export-SupabaseTable([string]$restUrl, [string]$serviceRoleKey, [string]$table, [string]$outFile, [int]$pageSize) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $writer = [System.IO.StreamWriter]::new($outFile, $false, $utf8NoBom)
  $offset = 0
  $rowCount = 0L
  try {
    while ($true) {
      $encodedTable = [System.Uri]::EscapeDataString($table)
      $url = "$restUrl/$encodedTable`?select=*&limit=$pageSize&offset=$offset"
      $headers = @{
        apikey = $serviceRoleKey
        Accept = "application/json"
      }
      if ($serviceRoleKey -notlike 'sb_secret_*') {
        $headers.Authorization = "Bearer $serviceRoleKey"
      }
      $rows = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 180
      $pageRows = @($rows)
      if ($null -eq $rows) { $pageRows = @() }
      foreach ($row in $pageRows) {
        $writer.WriteLine(($row | ConvertTo-Json -Compress -Depth 100))
        $rowCount++
      }
      if ($pageRows.Count -lt $pageSize) { break }
      $offset += $pageSize
    }
  } finally {
    $writer.Dispose()
  }
  return $rowCount
}

function New-CsvCopySql([string]$jsonlPath, [string]$sqlPath, [string]$qualifiedTable) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $reader = [System.IO.StreamReader]::new($jsonlPath, [System.Text.Encoding]::UTF8, $true)
  $writer = [System.IO.StreamWriter]::new($sqlPath, $false, $utf8NoBom)
  $count = 0L
  try {
    $writer.WriteLine("BEGIN;")
    $writer.WriteLine("TRUNCATE TABLE $qualifiedTable RESTART IDENTITY;")
    $writer.WriteLine("COPY $qualifiedTable (data_text) FROM STDIN WITH (FORMAT csv, QUOTE '`"', ESCAPE '`"');")
    while (($line = $reader.ReadLine()) -ne $null) {
      if ([string]::IsNullOrWhiteSpace($line)) { continue }
      $writer.Write('"')
      $writer.Write($line.Replace('"', '""'))
      $writer.WriteLine('"')
      $count++
    }
    $writer.WriteLine("\.")
    $writer.WriteLine("UPDATE $qualifiedTable SET data = supabase_rest.try_jsonb(data_text);")
    $writer.WriteLine("COMMIT;")
  } finally {
    $reader.Dispose()
    $writer.Dispose()
  }
  return $count
}

function Get-MirrorRowCount([string]$sourceTable) {
  $pgTable = Get-StableTableName $sourceTable
  $regclass = "supabase_rest." + $pgTable
  $exists = Run-PsqlScalar ("SELECT to_regclass({0}) IS NOT NULL;" -f (PgQuoteLiteral $regclass))
  if ($exists -ne 't') { return 0L }
  $qualified = "supabase_rest." + (PgQuoteIdent $pgTable)
  return [int64](Run-PsqlScalar ("SELECT count(*) FROM {0}" -f $qualified))
}

function Import-JsonlTable([string]$sourceTable, [string]$jsonlPath) {
  $pgTable = Get-StableTableName $sourceTable
  $qualified = "supabase_rest." + (PgQuoteIdent $pgTable)
  $sqlPath = Join-Path $workDir ($pgTable + ".copy.sql")
  Run-PsqlCommand ("CREATE TABLE IF NOT EXISTS {0} (`n  _import_row bigserial PRIMARY KEY,`n  data_text text NOT NULL,`n  data jsonb,`n  imported_at timestamptz NOT NULL DEFAULT now()`n);" -f $qualified) | Out-Null
  $lineCount = New-CsvCopySql -jsonlPath $jsonlPath -sqlPath $sqlPath -qualifiedTable $qualified
  try {
    Run-PsqlFile $sqlPath | Out-Null
  } finally {
    Remove-Item -LiteralPath $sqlPath -Force -ErrorAction SilentlyContinue
  }
  $importedRows = [int64](Run-PsqlScalar ("SELECT count(*) FROM {0}" -f $qualified))
  $jsonbRows = [int64](Run-PsqlScalar ("SELECT count(*) FROM {0} WHERE data IS NOT NULL" -f $qualified))
  $invalidRows = $importedRows - $jsonbRows
  Run-PsqlCommand ("INSERT INTO supabase_rest.table_map(source_table, pg_table, source_file, imported_at) VALUES ({0}, {1}, {2}, now()) ON CONFLICT (source_table) DO UPDATE SET pg_table=EXCLUDED.pg_table, source_file=EXCLUDED.source_file, imported_at=now();" -f (PgQuoteLiteral $sourceTable),(PgQuoteLiteral $pgTable),(PgQuoteLiteral $jsonlPath)) | Out-Null
  return [pscustomobject]@{
    source_table = $sourceTable
    pg_table = $pgTable
    exported_rows = $lineCount
    imported_rows = $importedRows
    jsonb_rows = $jsonbRows
    invalid_json_rows = $invalidRows
  }
}

$report = [ordered]@{
  started_at = (Get-Date).ToString('o')
  server = $env:COMPUTERNAME
  backup_root = $null
  status = 'running'
  totals = [ordered]@{
    tables = 0
    ok = 0
    failed = 0
    rows = 0
    jsonb_rows = 0
    invalid_json_rows = 0
    allow_shrink = $false
    max_shrink_percent = 50
  }
  failures = @()
  largest_imports = @()
  latest_postgres_backups = @()
}

try {
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
  New-Item -ItemType Directory -Force -Path $syncRoot,$logsDir,$workDir,(Split-Path -Parent $tablesFile) | Out-Null
  if (-not (Test-Path -LiteralPath $script:psql)) { throw "psql introuvable : $script:psql" }
  $syncConfig = Read-EnvFile $configFile
  $pgSecret = Read-EnvFile $postgresSecretFile
  $restUrl = Normalize-RestUrl $syncConfig.SUPABASE_URL
  $serviceRoleKey = $syncConfig.SUPABASE_SERVICE_ROLE_KEY
  if ([string]::IsNullOrWhiteSpace($restUrl)) { throw "SUPABASE_URL absent" }
  if ([string]::IsNullOrWhiteSpace($serviceRoleKey)) { throw "SUPABASE_SERVICE_ROLE_KEY absent" }
  if ([string]::IsNullOrWhiteSpace($pgSecret.POSTGRES_PASSWORD)) { throw "POSTGRES_PASSWORD absent" }
  $pageSize = 1000
  if ($syncConfig.PAGE_SIZE -as [int]) { $pageSize = [int]$syncConfig.PAGE_SIZE }
  $allowShrink = $syncConfig.ALLOW_SHRINK -match '^(1|true|yes|oui|o)$'
  $maxShrinkPercent = 50
  if ($syncConfig.MAX_SHRINK_PERCENT -as [int]) { $maxShrinkPercent = [int]$syncConfig.MAX_SHRINK_PERCENT }
  if ($maxShrinkPercent -lt 0 -or $maxShrinkPercent -gt 100) { throw "MAX_SHRINK_PERCENT invalide : $maxShrinkPercent" }

  $env:PGPASSWORD = $pgSecret.POSTGRES_PASSWORD
  $env:PGCLIENTENCODING = 'UTF8'
  $env:PGOPTIONS = '-c client_min_messages=warning'
  $ready = Run-PsqlScalar "SELECT 1"
  if ($ready -ne '1') { throw "PostgreSQL ne repond pas correctement" }

  Run-PsqlCommand @"
CREATE SCHEMA IF NOT EXISTS supabase_rest;
CREATE OR REPLACE FUNCTION supabase_rest.try_jsonb(value text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS `$fn`$
BEGIN
  RETURN value::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
`$fn`$;
CREATE TABLE IF NOT EXISTS supabase_rest.table_map (
  source_table text PRIMARY KEY,
  pg_table text UNIQUE NOT NULL,
  source_file text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS supabase_rest.import_audit (
  import_id bigserial PRIMARY KEY,
  source_table text NOT NULL,
  pg_table text NOT NULL,
  source_file text NOT NULL,
  imported_rows bigint NOT NULL DEFAULT 0,
  jsonb_rows bigint NOT NULL DEFAULT 0,
  invalid_json_rows bigint NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  status text NOT NULL,
  error text
);
"@ | Out-Null

  $timestamp = TimestampForPath
  $backupRoot = Join-Path $syncRoot ("supabase-rest-sync-$timestamp")
  $tablesDir = Join-Path $backupRoot "tables"
  New-Item -ItemType Directory -Force -Path $tablesDir | Out-Null
  $report['backup_root'] = $backupRoot

  $tables = Get-TableList
  $report['totals']['tables'] = $tables.Count
  $report['totals']['allow_shrink'] = $allowShrink
  $report['totals']['max_shrink_percent'] = $maxShrinkPercent
  $results = New-Object System.Collections.Generic.List[object]
  $failures = New-Object System.Collections.Generic.List[object]
  $index = 0
  foreach ($table in $tables) {
    $index++
    $started = Get-Date
    Add-Log ("Sync {0}/{1} : {2}" -f $index, $tables.Count, $table)
    $jsonlPath = Join-Path $tablesDir ("$table.jsonl")
    $pgTable = Get-StableTableName $table
    try {
      $exportedRows = Export-SupabaseTable -restUrl $restUrl -serviceRoleKey $serviceRoleKey -table $table -outFile $jsonlPath -pageSize $pageSize
      $existingRows = Get-MirrorRowCount $table
      $minimumAllowedRows = [int64][math]::Floor([double]$existingRows * ((100 - $maxShrinkPercent) / 100))
      if (-not $allowShrink -and $existingRows -ge 100 -and $exportedRows -lt $minimumAllowedRows -and ($existingRows - $exportedRows) -gt 100) {
        throw ("Suspicious REST shrink for {0}: exported {1}, existing mirror {2}. DB left unchanged for this table. Set ALLOW_SHRINK=true only after validation." -f $table,$exportedRows,$existingRows)
      }
      $item = Import-JsonlTable -sourceTable $table -jsonlPath $jsonlPath
      Run-PsqlCommand ("INSERT INTO supabase_rest.import_audit(source_table, pg_table, source_file, imported_rows, jsonb_rows, invalid_json_rows, started_at, finished_at, status) VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, now(), 'ok');" -f (PgQuoteLiteral $table),(PgQuoteLiteral $pgTable),(PgQuoteLiteral $jsonlPath),$item.imported_rows,$item.jsonb_rows,$item.invalid_json_rows,(PgQuoteLiteral $started.ToString('o'))) | Out-Null
      $report['totals']['ok'] += 1
      $report['totals']['rows'] += [int64]$item.imported_rows
      $report['totals']['jsonb_rows'] += [int64]$item.jsonb_rows
      $report['totals']['invalid_json_rows'] += [int64]$item.invalid_json_rows
      $results.Add($item) | Out-Null
    } catch {
      $err = ($_ | Out-String).Trim()
      $failure = [pscustomobject]@{ source_table = $table; pg_table = $pgTable; error = $err }
      $failures.Add($failure) | Out-Null
      $report['totals']['failed'] += 1
      try {
        Run-PsqlCommand ("INSERT INTO supabase_rest.import_audit(source_table, pg_table, source_file, imported_rows, jsonb_rows, invalid_json_rows, started_at, finished_at, status, error) VALUES ({0}, {1}, {2}, 0, 0, 0, {3}, now(), 'failed', {4});" -f (PgQuoteLiteral $table),(PgQuoteLiteral $pgTable),(PgQuoteLiteral $jsonlPath),(PgQuoteLiteral $started.ToString('o')),(PgQuoteLiteral $err)) | Out-Null
      } catch {}
      Add-Log ("ECHEC sync {0}: {1}" -f $table, $err)
    }
  }

  if (Test-Path -LiteralPath $backupScript) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $backupScript
    if ($LASTEXITCODE -ne 0) { throw "Backup PostgreSQL post-sync failed with exit code $LASTEXITCODE" }
  }
  $pgBackupDir = Join-Path $base "Backups\PostgreSQL"
  $report['latest_postgres_backups'] = @(Get-ChildItem -LiteralPath $pgBackupDir -Filter 'taxiassur_*.dump' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name,Length,LastWriteTime)
  $report['largest_imports'] = @($results.ToArray() | Sort-Object imported_rows -Descending | Select-Object -First 25)
  $report['failures'] = @($failures.ToArray())
  $report['status'] = if ($report['totals']['failed'] -eq 0) { 'ok' } else { 'partial' }
  $report['finished_at'] = (Get-Date).ToString('o')
  $report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $reportLatest -Encoding UTF8
  $timestampReport = Join-Path $logsDir ("supabase-postgres-sync-$timestamp.json")
  $report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $timestampReport -Encoding UTF8
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:\PGCLIENTENCODING -ErrorAction SilentlyContinue
  Remove-Item Env:\PGOPTIONS -ErrorAction SilentlyContinue
  if ($report['totals']['failed'] -gt 0) { exit 2 }
  exit 0
} catch {
  $report['status'] = 'failed'
  $report['error'] = ($_ | Out-String)
  $report['finished_at'] = (Get-Date).ToString('o')
  New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
  $report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $reportLatest -Encoding UTF8
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:\PGCLIENTENCODING -ErrorAction SilentlyContinue
  Remove-Item Env:\PGOPTIONS -ErrorAction SilentlyContinue
  throw
}



