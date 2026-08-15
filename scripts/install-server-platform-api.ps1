param(
  [string]$BasePath = 'F:\TaxiAssur',
  [int]$ApiPort = 8796,
  [string]$ReportPath = 'C:\Windows\Temp\taxiassur-platform-api-install.json'
)
$ErrorActionPreference = 'Stop'
$started = Get-Date
$result = [ordered]@{ ok = $false; started_at = $started.ToString('o'); platform_health = $null; proxy_health = $null; error = $null }

function New-Secret([int]$Bytes = 48) {
  $buffer = New-Object byte[] $Bytes
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($buffer) } finally { $generator.Dispose() }
  return (($buffer | ForEach-Object { $_.ToString('x2') }) -join '')
}
function Read-Env([string]$Path) {
  $values = @{}
  if (-not (Test-Path $Path)) { return $values }
  foreach ($line in Get-Content $Path) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') { $values[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'") }
  }
  return $values
}

try {
  $apiDir = Join-Path $BasePath 'Api'
  $scriptsDir = Join-Path $BasePath 'Scripts'
  $secretsDir = Join-Path $BasePath 'Secrets'
  $logsDir = Join-Path $BasePath 'Logs'
  $documentsDir = Join-Path $BasePath 'Documents'
  foreach ($directory in @($apiDir, $scriptsDir, $secretsDir, $logsDir, $documentsDir)) { New-Item -ItemType Directory -Force -Path $directory | Out-Null }
  $apiFile = Join-Path $apiDir 'taxiassur-platform-api.mjs'
  if (-not (Test-Path $apiFile)) { throw "Missing API file: $apiFile" }
  $envFile = Join-Path $secretsDir 'taxiassur-platform-api.env'
  $existing = Read-Env $envFile
  $token = if ($existing.TAXIASSUR_PLATFORM_API_TOKEN) { $existing.TAXIASSUR_PLATFORM_API_TOKEN } else { New-Secret }
  @(
    "TAXIASSUR_PLATFORM_API_HOST=127.0.0.1",
    "TAXIASSUR_PLATFORM_API_PORT=$ApiPort",
    "TAXIASSUR_PLATFORM_API_TOKEN=$token",
    "TAXIASSUR_DOCUMENT_ROOT=$($documentsDir -replace '\\','/')",
    "TAXIASSUR_PLATFORM_ALLOWED_ORIGINS=https://taxiassur.com,https://www.taxiassur.com,http://localhost:5173,http://localhost:4173",
    "CLAMSCAN_PATH=C:/Program Files/ClamAV/clamscan.exe",
    "CLAMSCAN_DATABASE_PATH=F:/TaxiAssur/ClamAV/db"
  ) | Set-Content -LiteralPath $envFile -Encoding UTF8
  $launcher = Join-Path $scriptsDir 'start-taxiassur-platform-api.ps1'
  @(
    '$ErrorActionPreference = ''Stop''',
    '$node = ''C:\Program Files\nodejs\node.exe''',
    '$api = ''F:\TaxiAssur\Api\taxiassur-platform-api.mjs''',
    '$out = ''F:\TaxiAssur\Logs\taxiassur-platform-api.out.log''',
    '$err = ''F:\TaxiAssur\Logs\taxiassur-platform-api.err.log''',
    '& $node $api 1>> $out 2>> $err'
  ) | Set-Content -LiteralPath $launcher -Encoding UTF8

  $taskName = 'TaxiAssur Platform API'
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`""
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 20 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object CommandLine -Like '*taxiassur-platform-api.mjs*' | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  Start-ScheduledTask -TaskName $taskName
  Start-Sleep -Seconds 3
  $platform = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$ApiPort/health" -TimeoutSec 10
  $result.platform_health = [ordered]@{ status = [int]$platform.StatusCode; body = $platform.Content }
  $platformJson = $platform.Content | ConvertFrom-Json
  if ($platformJson.service -ne 'taxiassur-platform-api' -or $platformJson.storage -ne 'local') {
    throw "Unexpected service on platform API port $ApiPort"
  }

  $readTask = Get-ScheduledTask -TaskName 'TaxiAssur PostgreSQL Read API' -ErrorAction SilentlyContinue
  if ($readTask) {
    Stop-ScheduledTask -TaskName $readTask.TaskName -ErrorAction SilentlyContinue
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object CommandLine -Like '*postgres-read-api.mjs*' | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    Start-ScheduledTask -TaskName $readTask.TaskName
    Start-Sleep -Seconds 3
    $proxy = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8791/platform/health' -TimeoutSec 10
    $result.proxy_health = [ordered]@{ status = [int]$proxy.StatusCode; body = $proxy.Content }
    $proxyJson = $proxy.Content | ConvertFrom-Json
    if ($proxyJson.service -ne 'taxiassur-platform-api' -or $proxyJson.storage -ne 'local') {
      throw 'Unexpected service behind the platform proxy'
    }
  }
  $result.ok = $result.platform_health.status -eq 200 -and $result.proxy_health.status -eq 200
} catch {
  $result.error = $_.Exception.Message
}
$result.completed_at = (Get-Date).ToString('o')
$result.duration_seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 2)
$result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
