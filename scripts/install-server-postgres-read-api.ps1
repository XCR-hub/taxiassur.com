param(
  [string]$Server = '192.168.1.70',
  [string]$DefaultUser = 'XCR\Administrateur',
  [switch]$UseStoredCredentials,
  [string]$RemoteBase = 'F:\TaxiAssur',
  [int]$ApiPort = 8791,
  [string]$ReportPath = "$env:USERPROFILE\taxiassur-postgres-read-api-install-192-168-1-70.json"
)

$ErrorActionPreference = 'Stop'

function Read-AdminCredential([string]$DefaultUser) {
  $user = Read-Host "Utilisateur admin serveur [$DefaultUser]"
  if ([string]::IsNullOrWhiteSpace($user)) { $user = $DefaultUser }
  $password = Read-Host "Mot de passe admin serveur" -AsSecureString
  return [pscredential]::new($user, $password)
}

function Step([string]$Message) {
  Write-Host "[$(Get-Date -Format HH:mm:ss)] $Message"
}

function Save-Report($Report) {
  $Report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$localApi = Join-Path $repoRoot 'server\postgres-read-api.mjs'
if (-not (Test-Path -LiteralPath $localApi)) { throw "Local API not found: $localApi" }

Write-Host 'Install TaxiAssur read-only PostgreSQL API'
Write-Host "Server: $Server"
Write-Host "Local server port: $ApiPort"
Write-Host 'No secret will be printed. API token and DB password stay in F:\TaxiAssur\Secrets.'
Write-Host ''

$credential = if ($UseStoredCredentials) { $null } else { Read-AdminCredential -DefaultUser $DefaultUser }

$report = [ordered]@{
  ok = $false
  server = $Server
  started_at = (Get-Date).ToString('o')
  steps = @()
  result = $null
}

function Add-Step([string]$Name, [bool]$Ok, [string]$Message) {
  $report.steps += [ordered]@{ name = $Name; ok = $Ok; message = $Message }
}

try {
  Step 'Opening WinRM session'
  $sessionParams = @{ ComputerName = $Server; Authentication = 'Negotiate' }
  if ($credential) { $sessionParams.Credential = $credential }
  $session = New-PSSession @sessionParams
  Add-Step 'WinRM session' $true 'Session opened'

  try {
    Step 'Preparing remote directories'
    Invoke-Command -Session $session -ArgumentList $RemoteBase -ScriptBlock {
      param($RemoteBase)
      foreach ($dir in @(
        (Join-Path $RemoteBase 'Api'),
        (Join-Path $RemoteBase 'Scripts'),
        (Join-Path $RemoteBase 'Secrets'),
        (Join-Path $RemoteBase 'Logs')
      )) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
      }
    }
    Add-Step 'Remote directories' $true 'Api/Scripts/Secrets/Logs ready'

    Step 'Copying Node API'
    Copy-Item -LiteralPath $localApi -Destination ($RemoteBase.TrimEnd('\') + '\Api\postgres-read-api.mjs') -ToSession $session -Force
    Add-Step 'API copied' $true 'postgres-read-api.mjs copied'

    Step 'Configuring DB role, secrets, and scheduled task'
    $remoteResult = Invoke-Command -Session $session -ArgumentList $RemoteBase,$ApiPort -ScriptBlock {
      param($RemoteBase,$ApiPort)
      $ErrorActionPreference = 'Stop'

      function Read-EnvFile([string]$Path) {
        $out = @{}
        if (-not (Test-Path -LiteralPath $Path)) { return $out }
        foreach ($raw in Get-Content -LiteralPath $Path) {
          $line = $raw.Trim()
          if (-not $line -or $line.StartsWith('#')) { continue }
          $idx = $line.IndexOf('=')
          if ($idx -le 0) { continue }
          $key = $line.Substring(0, $idx).Trim()
          $value = $line.Substring($idx + 1).Trim()
          $out[$key] = $value
        }
        return $out
      }

      function New-Secret([int]$Bytes = 32) {
        $data = [byte[]]::new($Bytes)
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($data) } finally { $rng.Dispose() }
        return [Convert]::ToBase64String($data).TrimEnd('=').Replace('+', '-').Replace('/', '_')
      }

      function PgQuoteLiteral([string]$Value) {
        if ($null -eq $Value) { return 'NULL' }
        return "'" + $Value.Replace("'", "''") + "'"
      }

      function Run-Psql([string]$Sql) {
        $output = & $script:psql -h 127.0.0.1 -p 5432 -U postgres -d taxiassur -v ON_ERROR_STOP=1 -q -X -c $Sql 2>&1
        if ($LASTEXITCODE -ne 0) { throw "psql failed: $($output -join ' | ')" }
        return (($output) -join "`n").Trim()
      }

      $apiDir = Join-Path $RemoteBase 'Api'
      $scriptsDir = Join-Path $RemoteBase 'Scripts'
      $secretsDir = Join-Path $RemoteBase 'Secrets'
      $logsDir = Join-Path $RemoteBase 'Logs'
      $apiFile = Join-Path $apiDir 'postgres-read-api.mjs'
      $envFile = Join-Path $secretsDir 'taxiassur-postgres-read-api.env'
      $pgSecretFile = Join-Path $secretsDir 'postgresql.env'
      $script:psql = Join-Path $RemoteBase 'PostgreSQL\runtime\pgsql\bin\psql.exe'
      $node = (Get-Command node -ErrorAction Stop).Source

      if (-not (Test-Path -LiteralPath $apiFile)) { throw "API missing: $apiFile" }
      if (-not (Test-Path -LiteralPath $script:psql)) { throw "psql missing: $script:psql" }
      if (-not (Test-Path -LiteralPath $pgSecretFile)) { throw "PostgreSQL secret missing: $pgSecretFile" }

      $pgSecret = Read-EnvFile $pgSecretFile
      if ([string]::IsNullOrWhiteSpace($pgSecret.POSTGRES_PASSWORD)) { throw 'POSTGRES_PASSWORD missing from postgresql.env' }

      $existing = Read-EnvFile $envFile
      $apiToken = if ($existing.TAXIASSUR_READ_API_TOKEN) { $existing.TAXIASSUR_READ_API_TOKEN } else { New-Secret 36 }
      $readPassword = if ($existing.TAXIASSUR_READ_API_DB_PASSWORD) { $existing.TAXIASSUR_READ_API_DB_PASSWORD } else { New-Secret 32 }

      $env:PGPASSWORD = $pgSecret.POSTGRES_PASSWORD
      $roleExistsOutput = & $script:psql -h 127.0.0.1 -p 5432 -U postgres -d taxiassur -tAc "SELECT 1 FROM pg_roles WHERE rolname='taxiassur_read_api';" 2>&1
      if ($LASTEXITCODE -ne 0) { throw "role check failed: $($roleExistsOutput -join ' | ')" }
      $roleExists = (($roleExistsOutput) -join '').Trim() -eq '1'
      $passwordSql = PgQuoteLiteral $readPassword
      if ($roleExists) {
        Run-Psql "ALTER ROLE taxiassur_read_api WITH LOGIN PASSWORD $passwordSql;" | Out-Null
      } else {
        Run-Psql "CREATE ROLE taxiassur_read_api LOGIN PASSWORD $passwordSql;" | Out-Null
      }
      Run-Psql 'GRANT CONNECT ON DATABASE taxiassur TO taxiassur_read_api;' | Out-Null
      Run-Psql 'GRANT USAGE ON SCHEMA supabase_rest TO taxiassur_read_api;' | Out-Null
      Run-Psql 'GRANT SELECT ON ALL TABLES IN SCHEMA supabase_rest TO taxiassur_read_api;' | Out-Null
      Run-Psql 'ALTER DEFAULT PRIVILEGES IN SCHEMA supabase_rest GRANT SELECT ON TABLES TO taxiassur_read_api;' | Out-Null
      Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

      @(
        "TAXIASSUR_READ_API_PORT=$ApiPort",
        'TAXIASSUR_READ_API_HOST=127.0.0.1',
        'TAXIASSUR_DB_HOST=127.0.0.1',
        'TAXIASSUR_DB_PORT=5432',
        'TAXIASSUR_DB_NAME=taxiassur',
        'TAXIASSUR_DB_SCHEMA=supabase_rest',
        'TAXIASSUR_READ_API_DB_USER=taxiassur_read_api',
        "TAXIASSUR_READ_API_DB_PASSWORD=$readPassword",
        "TAXIASSUR_READ_API_TOKEN=$apiToken",
        'TAXIASSUR_READ_API_ALLOWED_TABLES=blog_posts,city_pages,faq_entries,news_articles,gsc_pages,gsc_queries',
        'TAXIASSUR_READ_API_ALLOWED_ORIGINS=https://taxiassur.com,https://www.taxiassur.com,http://localhost:5173,http://localhost:4173',
        "TAXIASSUR_PSQL_PATH=$script:psql",
        'TAXIASSUR_READ_API_MAX_LIMIT=250',
        'TAXIASSUR_READ_API_DEFAULT_LIMIT=50'
      ) | Set-Content -LiteralPath $envFile -Encoding UTF8

      try { icacls.exe $envFile /inheritance:r /grant:r 'SYSTEM:F' 'Administrateurs:F' | Out-Null } catch { }

      $outLog = Join-Path $logsDir 'taxiassur-postgres-read-api.out.log'
      $errLog = Join-Path $logsDir 'taxiassur-postgres-read-api.err.log'
      $startupScript = Join-Path $scriptsDir 'start-postgres-read-api.ps1'

      @"
`$ErrorActionPreference = 'Stop'
`$env:TAXIASSUR_READ_API_ENV_FILE = '$envFile'
Remove-Item -LiteralPath '$outLog','$errLog' -Force -ErrorAction SilentlyContinue
Start-Process -FilePath '$node' -ArgumentList '$apiFile' -WorkingDirectory '$apiDir' -WindowStyle Hidden -RedirectStandardOutput '$outLog' -RedirectStandardError '$errLog'
"@ | Set-Content -LiteralPath $startupScript -Encoding UTF8

      $taskName = 'TaxiAssur PostgreSQL Read API'
      Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
      $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startupScript`""
      $trigger = New-ScheduledTaskTrigger -AtStartup
      $settings = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
      Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force | Out-Null

      Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
        try {
          $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
          if ($cmd -like '*postgres-read-api.mjs*') { Stop-Process -Id $_.Id -Force }
        } catch { }
      }

      Start-ScheduledTask -TaskName $taskName
      Start-Sleep -Seconds 3

      $health = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$ApiPort/health" -TimeoutSec 10
      $apiHealth = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$ApiPort/api/health" -Headers @{ Authorization = "Bearer $apiToken" } -TimeoutSec 15

      [pscustomobject]@{
        computer = $env:COMPUTERNAME
        api_file = $apiFile
        env_file = $envFile
        startup_script = $startupScript
        task = $taskName
        port = $ApiPort
        host = '127.0.0.1'
        health_status = [int]$health.StatusCode
        api_health_status = [int]$apiHealth.StatusCode
        api_health_body = ($apiHealth.Content | ConvertFrom-Json)
        token_present = $true
        token_length = $apiToken.Length
        db_user = 'taxiassur_read_api'
      }
    }
    Add-Step 'Remote install' $true 'API configured and tested locally on server'
  } finally {
    Remove-PSSession -Session $session
  }

  $report.ok = $true
  $report.result = $remoteResult
  $report.finished_at = (Get-Date).ToString('o')
  Save-Report $report
  Step "Install finished. Report: $ReportPath"
  Get-Content -LiteralPath $ReportPath -Raw
} catch {
  $report.ok = $false
  $report.error = $_.Exception.Message
  $report.finished_at = (Get-Date).ToString('o')
  Save-Report $report
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Report written: $ReportPath"
  exit 1
}
