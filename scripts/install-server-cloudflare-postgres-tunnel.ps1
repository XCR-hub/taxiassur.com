param(
  [string]$Server = '192.168.1.70',
  [string]$DefaultUser = 'XCR\Administrateur',
  [switch]$UseStoredCredentials,
  [string]$RemoteBase = 'F:\TaxiAssur',
  [string]$CloudflareAccountId = 'fcca12a7ddf64e6dc782494bdb487b8e',
  [string]$TunnelId = '8991799c-6ed6-45a9-9ce4-f1b3e7c9c466',
  [string]$TunnelName = 'taxiassur-postgres-read-api',
  [string]$Hostname = 'postgres-read-api.taxiassur.com',
  [string]$ZoneName = 'taxiassur.com',
  [string]$OriginService = 'http://localhost:8791',
  [switch]$ConfigureDns,
  [string]$ReportPath = "$env:USERPROFILE\taxiassur-cloudflare-postgres-tunnel-192-168-1-70.json"
)

$ErrorActionPreference = 'Stop'

function Read-AdminCredential([string]$DefaultUser) {
  $user = Read-Host "Utilisateur admin serveur [$DefaultUser]"
  if ([string]::IsNullOrWhiteSpace($user)) { $user = $DefaultUser }
  $password = Read-Host 'Mot de passe admin serveur' -AsSecureString
  return [pscredential]::new($user, $password)
}

function ConvertFrom-SecureStringPlain([securestring]$Value) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Get-WranglerOAuthToken {
  $configPath = Join-Path $env:APPDATA 'xdg.config\.wrangler\config\default.toml'
  if (-not (Test-Path -LiteralPath $configPath)) { throw "Wrangler config not found: $configPath" }
  $config = Get-Content -LiteralPath $configPath -Raw
  $match = [regex]::Match($config, 'oauth_token\s*=\s*"([^"]+)"')
  if (-not $match.Success) { throw 'Wrangler OAuth token not found. Run: npx wrangler login' }
  return $match.Groups[1].Value
}

function Invoke-CfApi([string]$Method, [string]$Uri, [string]$Token, $Body = $null) {
  $headers = @{ Authorization = "Bearer $Token"; 'Content-Type' = 'application/json' }
  $params = @{ Method = $Method; Uri = $Uri; Headers = $headers }
  if ($null -ne $Body) { $params.Body = $Body }
  Invoke-RestMethod @params
}

function Save-Report($Report) {
  $Report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
}

function Step([string]$Message) {
  Write-Host "[$(Get-Date -Format HH:mm:ss)] $Message"
}

Write-Host 'Install TaxiAssur Cloudflare Tunnel for PostgreSQL read API'
Write-Host "Server: $Server"
Write-Host "Tunnel: $TunnelName / $TunnelId"
Write-Host "Hostname: $Hostname -> $OriginService"
Write-Host 'No connector token, API token, or DNS token will be printed.'
Write-Host ''

$report = [ordered]@{
  ok = $false
  server = $Server
  tunnel_id = $TunnelId
  tunnel_name = $TunnelName
  hostname = $Hostname
  origin_service = $OriginService
  started_at = (Get-Date).ToString('o')
  steps = @()
  result = $null
}

function Add-Step([string]$Name, [bool]$Ok, [string]$Message) {
  $report.steps += [ordered]@{ name = $Name; ok = $Ok; message = $Message }
}

try {
  Step 'Reading Wrangler OAuth token'
  $oauthToken = Get-WranglerOAuthToken
  Add-Step 'wrangler_oauth' $true 'OAuth token read from local Wrangler config'

  Step 'Configuring Cloudflare Tunnel ingress'
  $connector = Invoke-CfApi -Method Get -Uri "https://api.cloudflare.com/client/v4/accounts/$CloudflareAccountId/cfd_tunnel/$TunnelId/token" -Token $oauthToken
  $connectorToken = [string]$connector.result
  if ([string]::IsNullOrWhiteSpace($connectorToken)) { throw 'Cloudflare connector token is empty' }

  $ingressBody = @{
    config = @{
      ingress = @(
        @{ hostname = $Hostname; service = $OriginService },
        @{ service = 'http_status:404' }
      )
    }
  } | ConvertTo-Json -Depth 10
  $ingress = Invoke-CfApi -Method Put -Uri "https://api.cloudflare.com/client/v4/accounts/$CloudflareAccountId/cfd_tunnel/$TunnelId/configurations" -Token $oauthToken -Body $ingressBody
  Add-Step 'cloudflare_ingress' ([bool]$ingress.success) "Ingress configured for $Hostname"

  $dnsResult = $null
  if ($ConfigureDns) {
    Step 'Configuring Cloudflare DNS CNAME'
    $dnsToken = $env:CLOUDFLARE_DNS_API_TOKEN
    if ([string]::IsNullOrWhiteSpace($dnsToken)) {
      $secureDnsToken = Read-Host 'Cloudflare DNS API token with Zone DNS Edit' -AsSecureString
      $dnsToken = ConvertFrom-SecureStringPlain $secureDnsToken
    }
    if ([string]::IsNullOrWhiteSpace($dnsToken)) { throw 'Cloudflare DNS API token is required with -ConfigureDns' }

    $zone = Invoke-CfApi -Method Get -Uri "https://api.cloudflare.com/client/v4/zones?name=$ZoneName" -Token $oauthToken
    $zoneId = $zone.result[0].id
    if ([string]::IsNullOrWhiteSpace($zoneId)) { throw "Zone not found: $ZoneName" }

    $target = "$TunnelId.cfargotunnel.com"
    $existing = Invoke-CfApi -Method Get -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?type=CNAME&name=$Hostname" -Token $dnsToken
    if ($existing.result.Count -gt 0) {
      $recordId = $existing.result[0].id
      $dnsUri = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$recordId"
      $dnsMethod = 'Put'
    } else {
      $dnsUri = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records"
      $dnsMethod = 'Post'
    }
    $recordName = $Hostname.Substring(0, $Hostname.Length - $ZoneName.Length - 1)
    $dnsBody = @{ type = 'CNAME'; name = $recordName; content = $target; proxied = $true; ttl = 1; comment = 'TaxiAssur local PostgreSQL read API tunnel' } | ConvertTo-Json -Depth 5
    $dns = Invoke-CfApi -Method $dnsMethod -Uri $dnsUri -Token $dnsToken -Body $dnsBody
    $dnsResult = [ordered]@{ configured = [bool]$dns.success; method = $dnsMethod; name = $dns.result.name; target = $dns.result.content; proxied = [bool]$dns.result.proxied }
    Add-Step 'cloudflare_dns' ([bool]$dns.success) "CNAME configured for $Hostname"
  } else {
    Add-Step 'cloudflare_dns' $true 'Skipped. Use -ConfigureDns with CLOUDFLARE_DNS_API_TOKEN or secure prompt.'
  }

  Step 'Opening WinRM session'
  $credential = if ($UseStoredCredentials) { $null } else { Read-AdminCredential -DefaultUser $DefaultUser }
  $sessionParams = @{ ComputerName = $Server; Authentication = 'Negotiate' }
  if ($credential) { $sessionParams.Credential = $credential }
  $session = New-PSSession @sessionParams
  Add-Step 'winrm_session' $true 'Session opened'

  try {
    Step 'Installing remote cloudflared launcher and scheduled task'
    $remoteResult = Invoke-Command -Session $session -ArgumentList $RemoteBase,$connectorToken,$TunnelName -ScriptBlock {
      param($RemoteBase,$ConnectorToken,$TunnelName)
      $ErrorActionPreference = 'Stop'

      $cloudflaredDir = Join-Path $RemoteBase 'Cloudflared'
      $scriptsDir = Join-Path $RemoteBase 'Scripts'
      $secretsDir = Join-Path $RemoteBase 'Secrets'
      $logsDir = Join-Path $RemoteBase 'Logs'
      foreach ($dir in @($cloudflaredDir,$scriptsDir,$secretsDir,$logsDir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
      }

      $exe = Join-Path $cloudflaredDir 'cloudflared.exe'
      if (-not (Test-Path -LiteralPath $exe)) {
        Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $exe -UseBasicParsing
      }

      $tokenPath = Join-Path $secretsDir 'cloudflare-taxiassur-postgres-tunnel-token.txt'
      if (Test-Path -LiteralPath $tokenPath) {
        takeown.exe /F $tokenPath /A | Out-Null
        icacls.exe $tokenPath /inheritance:r /grant:r 'SYSTEM:(F)' 'Administrateurs:(F)' | Out-Null
      }
      Set-Content -LiteralPath $tokenPath -Value $ConnectorToken -NoNewline -Encoding ascii
      icacls.exe $tokenPath /inheritance:r /grant:r 'SYSTEM:(R)' 'Administrateurs:(R)' | Out-Null
      icacls.exe $cloudflaredDir /inheritance:e /grant 'SYSTEM:(OI)(CI)(RX)' 'Administrateurs:(OI)(CI)(F)' | Out-Null
      icacls.exe $scriptsDir /inheritance:e /grant 'SYSTEM:(OI)(CI)(RX)' 'Administrateurs:(OI)(CI)(F)' | Out-Null
      icacls.exe $logsDir /inheritance:e /grant 'SYSTEM:(OI)(CI)(F)' 'Administrateurs:(OI)(CI)(F)' | Out-Null

      $launcher = Join-Path $scriptsDir 'start-taxiassur-postgres-cloudflare-tunnel.ps1'
      if (Test-Path -LiteralPath $launcher) {
        takeown.exe /F $launcher /A | Out-Null
        icacls.exe $launcher /inheritance:r /grant:r 'SYSTEM:(F)' 'Administrateurs:(F)' | Out-Null
      }
      $safeRemoteBase = $RemoteBase.Replace("'", "''")
      $launcherLines = @(
        "`$base = '$safeRemoteBase'",
        "`$exe = Join-Path `$base 'Cloudflared\cloudflared.exe'",
        "`$tokenPath = Join-Path `$base 'Secrets\cloudflare-taxiassur-postgres-tunnel-token.txt'",
        "`$cloudLog = Join-Path `$base 'Logs\taxiassur-postgres-cloudflare-tunnel.log'",
        "`$wrapperLog = Join-Path `$base 'Logs\taxiassur-postgres-cloudflare-tunnel-wrapper.log'",
        '"[$(Get-Date -Format o)] launcher start as $([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)" | Add-Content -LiteralPath $wrapperLog -Encoding ascii',
        '"[$(Get-Date -Format o)] exe=$exe exeExists=$(Test-Path $exe) tokenFileExists=$(Test-Path $tokenPath)" | Add-Content -LiteralPath $wrapperLog -Encoding ascii',
        'try {',
        '  & $exe tunnel --no-autoupdate --logfile $cloudLog --loglevel info run --token-file $tokenPath >> $wrapperLog 2>&1',
        '  $code = $LASTEXITCODE',
        '  "[$(Get-Date -Format o)] cloudflared exit code=$code" | Add-Content -LiteralPath $wrapperLog -Encoding ascii',
        '  exit $code',
        '} catch {',
        '  "[$(Get-Date -Format o)] launcher exception=$($_.Exception.Message)" | Add-Content -LiteralPath $wrapperLog -Encoding ascii',
        '  exit 1',
        '}'
      )
      $launcherContent = ($launcherLines -join "`r`n") + "`r`n"
      Set-Content -LiteralPath $launcher -Value $launcherContent -Encoding ascii
      [scriptblock]::Create((Get-Content -LiteralPath $launcher -Raw)) | Out-Null
      icacls.exe $launcher /inheritance:r /grant:r 'SYSTEM:(RX)' 'Administrateurs:(RX)' | Out-Null

      $taskName = 'TaxiAssur Cloudflare Postgres Tunnel'
      Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
      $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`""
      $trigger = New-ScheduledTaskTrigger -AtStartup
      $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
      $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -RunLevel Highest
      Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Cloudflare Tunnel for $TunnelName" | Out-Null

      Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
      Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*start-taxiassur-postgres-cloudflare-tunnel.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
      Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.ExecutablePath -like "$cloudflaredDir*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
      schtasks.exe /Run /TN $taskName | Out-Null
      Start-Sleep -Seconds 12

      $task = Get-ScheduledTask -TaskName $taskName | Select-Object TaskName,State
      $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName | Select-Object LastRunTime,LastTaskResult,NextRunTime,NumberOfMissedRuns
      $processes = @(Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.ExecutablePath -like "$cloudflaredDir*" } | Select-Object ProcessId,ExecutablePath)

      [pscustomobject]@{
        computer = $env:COMPUTERNAME
        cloudflared_exe = $exe
        launcher = $launcher
        token_file_present = (Test-Path -LiteralPath $tokenPath)
        task = $task
        task_info = $taskInfo
        cloudflared_process_count = $processes.Count
        cloudflared_log_present = (Test-Path -LiteralPath (Join-Path $logsDir 'taxiassur-postgres-cloudflare-tunnel.log'))
      }
    }
    Add-Step 'remote_install' ($remoteResult.cloudflared_process_count -gt 0) 'Cloudflared launcher deployed and scheduled task started'
  } finally {
    Remove-PSSession -Session $session
  }

  $publicHealth = $null
  try {
    $health = Invoke-WebRequest -UseBasicParsing -Uri "https://$Hostname/health" -TimeoutSec 20
    $publicHealth = [ordered]@{ ok = $true; status = [int]$health.StatusCode; body = ($health.Content | ConvertFrom-Json) }
    Add-Step 'public_health' $true "https://$Hostname/health returned $($health.StatusCode)"
  } catch {
    $publicHealth = [ordered]@{ ok = $false; error = $_.Exception.Message }
    Add-Step 'public_health' $false "Public health check failed: $($_.Exception.Message)"
  }

  $report.ok = $true
  $report.result = [ordered]@{ dns = $dnsResult; remote = $remoteResult; public_health = $publicHealth }
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
