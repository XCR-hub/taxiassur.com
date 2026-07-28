param(
  [string]$Server = '192.168.1.70',
  [string]$DefaultUser = 'XCR\Administrateur',
  [switch]$UseStoredCredentials,
  [int]$ApiPort = 8791,
  [string]$RemoteBase = 'F:\TaxiAssur',
  [string]$ReportPath = "$env:USERPROFILE\taxiassur-postgres-read-api-test-192-168-1-70.json"
)

$ErrorActionPreference = 'Stop'

function Read-AdminCredential([string]$DefaultUser) {
  $user = Read-Host "Utilisateur admin serveur [$DefaultUser]"
  if ([string]::IsNullOrWhiteSpace($user)) { $user = $DefaultUser }
  $password = Read-Host "Mot de passe admin serveur" -AsSecureString
  return [pscredential]::new($user, $password)
}

function Save-Report($Report) {
  $Report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
}

Write-Host 'Test TaxiAssur read-only PostgreSQL API'
Write-Host "Server: $Server"
Write-Host 'No secret will be printed.'
Write-Host ''

$credential = if ($UseStoredCredentials) { $null } else { Read-AdminCredential -DefaultUser $DefaultUser }

$report = [ordered]@{
  ok = $false
  server = $Server
  checked_at = (Get-Date).ToString('o')
  result = $null
}

try {
  $sessionParams = @{ ComputerName = $Server; Authentication = 'Negotiate' }
  if ($credential) { $sessionParams.Credential = $credential }
  $session = New-PSSession @sessionParams
  try {
    $result = Invoke-Command -Session $session -ArgumentList $RemoteBase,$ApiPort -ScriptBlock {
      param($RemoteBase,$ApiPort)
      $ErrorActionPreference = 'Stop'

      function Read-EnvFile([string]$Path) {
        if (-not (Test-Path -LiteralPath $Path)) { throw "Env file not found: $Path" }
        $out = @{}
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

      $envFile = Join-Path $RemoteBase 'Secrets\taxiassur-postgres-read-api.env'
      $apiEnv = Read-EnvFile $envFile
      if ([string]::IsNullOrWhiteSpace($apiEnv.TAXIASSUR_READ_API_TOKEN)) { throw 'TAXIASSUR_READ_API_TOKEN missing' }

      $headers = @{ Authorization = "Bearer $($apiEnv.TAXIASSUR_READ_API_TOKEN)" }
      $health = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$ApiPort/health" -TimeoutSec 10
      $apiHealth = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$ApiPort/api/health" -Headers $headers -TimeoutSec 15
      $tables = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$ApiPort/api/tables" -Headers $headers -TimeoutSec 15
      $blog = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$ApiPort/api/read?table=blog_posts&limit=3" -Headers $headers -TimeoutSec 15

      $task = Get-ScheduledTask -TaskName 'TaxiAssur PostgreSQL Read API' -ErrorAction SilentlyContinue | Select-Object TaskName,State
      $taskInfo = Get-ScheduledTaskInfo -TaskName 'TaxiAssur PostgreSQL Read API' -ErrorAction SilentlyContinue | Select-Object LastRunTime,LastTaskResult,NextRunTime
      $processes = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*postgres-read-api.mjs*' } | Select-Object ProcessId)

      [pscustomobject]@{
        computer = $env:COMPUTERNAME
        health_status = [int]$health.StatusCode
        health = ($health.Content | ConvertFrom-Json)
        api_health_status = [int]$apiHealth.StatusCode
        api_health = ($apiHealth.Content | ConvertFrom-Json)
        tables_status = [int]$tables.StatusCode
        tables = ($tables.Content | ConvertFrom-Json)
        sample_status = [int]$blog.StatusCode
        sample = ($blog.Content | ConvertFrom-Json)
        task = $task
        task_info = $taskInfo
        process_count = $processes.Count
      }
    }
  } finally {
    Remove-PSSession -Session $session
  }

  $report.ok = $true
  $report.result = $result
  $report.finished_at = (Get-Date).ToString('o')
  Save-Report $report
  Write-Host "Test finished. Report: $ReportPath"
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
