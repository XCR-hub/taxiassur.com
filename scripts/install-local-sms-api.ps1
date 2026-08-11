[CmdletBinding()]
param(
  [string]$BasePath = 'F:\TaxiAssur',
  [int]$Port = 8792,
  [switch]$Enable,
  [string]$BrevoApiKey = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceApi = Join-Path $repoRoot 'server\sms-api.mjs'
$apiDir = Join-Path $BasePath 'Api'
$scriptsDir = Join-Path $BasePath 'Scripts'
$secretsDir = Join-Path $BasePath 'Secrets'
$logsDir = Join-Path $BasePath 'Logs'
$targetApi = Join-Path $apiDir 'sms-api.mjs'
$envFile = Join-Path $secretsDir 'taxiassur-sms-api.env'
$startScript = Join-Path $scriptsDir 'start-taxiassur-sms-api.ps1'
$taskName = 'TaxiAssur SMS API'

function Read-EnvFile([string]$Path) {
  $result = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $result }
  foreach ($raw in Get-Content -LiteralPath $Path) {
    $line = $raw.Trim()
    if (-not $line -or $line.StartsWith('#')) { continue }
    $separator = $line.IndexOf('=')
    if ($separator -lt 1) { continue }
    $result[$line.Substring(0, $separator).Trim()] = $line.Substring($separator + 1).Trim()
  }
  return $result
}

function New-Secret([int]$Bytes = 36) {
  $buffer = [byte[]]::new($Bytes)
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($buffer).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

if (-not (Test-Path -LiteralPath $sourceApi)) { throw "SMS API source missing: $sourceApi" }
foreach ($directory in @($apiDir, $scriptsDir, $secretsDir, $logsDir)) {
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
}

$existing = Read-EnvFile $envFile
$token = if ($existing.TAXIASSUR_SMS_API_TOKEN) { $existing.TAXIASSUR_SMS_API_TOKEN } else { New-Secret }
$providerKey = if ($BrevoApiKey) { $BrevoApiKey } elseif ($existing.BREVO_API_KEY) { $existing.BREVO_API_KEY } else { '' }
$enabled = $Enable.IsPresent -and -not [string]::IsNullOrWhiteSpace($providerKey)

Copy-Item -LiteralPath $sourceApi -Destination $targetApi -Force
@(
  "TAXIASSUR_SMS_API_HOST=127.0.0.1"
  "TAXIASSUR_SMS_API_PORT=$Port"
  "TAXIASSUR_SMS_API_TOKEN=$token"
  "TAXIASSUR_SMS_ENABLED=$($enabled.ToString().ToLowerInvariant())"
  'TAXIASSUR_SMS_SENDER=TaxiAssur'
  "BREVO_API_KEY=$providerKey"
) | Set-Content -LiteralPath $envFile -Encoding UTF8

try { icacls.exe $envFile /inheritance:r /grant:r 'SYSTEM:F' 'Administrateurs:F' | Out-Null } catch { }

$node = (Get-Command node -ErrorAction Stop).Source
$outLog = Join-Path $logsDir 'taxiassur-sms-api.out.log'
$errLog = Join-Path $logsDir 'taxiassur-sms-api.err.log'
@"
`$ErrorActionPreference = 'Stop'
`$process = Start-Process -FilePath '$node' -ArgumentList '$targetApi' -WorkingDirectory '$apiDir' -RedirectStandardOutput '$outLog' -RedirectStandardError '$errLog' -WindowStyle Hidden -PassThru
Wait-Process -Id `$process.Id
exit `$process.ExitCode
"@ | Set-Content -LiteralPath $startScript -Encoding UTF8

Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 3

$health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 10
$disabledStatus = $null
if (-not $enabled) {
  try {
    Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$Port/api/sms/send" -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body '{"to":"0612345678","content":"diagnostic"}' -TimeoutSec 10 | Out-Null
  } catch {
    $disabledStatus = [int]$_.Exception.Response.StatusCode
  }
}

[pscustomobject]@{
  ok = [bool]$health.ok
  task = $taskName
  port = $Port
  enabled = [bool]$health.enabled
  provider_configured = [bool]$health.provider_configured
  disabled_send_status = $disabledStatus
  api_file = $targetApi
  env_file = $envFile
  token_length = $token.Length
} | ConvertTo-Json -Depth 4
