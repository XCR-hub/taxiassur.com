param(
  [string]$Server = '192.168.1.70',
  [string]$UserName = 'XCR\Administrateur'
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repo 'server\taxiassur-platform-api.mjs'
$report = Join-Path $repo 'reports\native-api-deployment.json'
$session = $null
$result = [ordered]@{ ok = $false; server = $Server; checked_at = (Get-Date).ToString('o'); error = $null }
try {
  & node --check $source
  if ($LASTEXITCODE -ne 0) { throw 'La syntaxe de la version locale est invalide.' }
  $expected = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
  Write-Host 'Installation du correctif de validation des documents TaxiAssur.'
  Write-Host 'Le mot de passe reste en memoire et ne sera pas enregistre.'
  $account = Read-Host "Compte Windows du serveur [$UserName]"
  if ([string]::IsNullOrWhiteSpace($account)) { $account = $UserName }
  $securePassword = Read-Host 'Mot de passe Windows (saisie masquee)' -AsSecureString
  $credential = [PSCredential]::new($account, $securePassword)
  $session = New-PSSession -ComputerName $Server -Authentication Negotiate -Credential $credential
  $remote = 'F:\TaxiAssur\Api\taxiassur-platform-api.mjs'
  $stage = 'F:\TaxiAssur\Api\taxiassur-platform-api.document-fix.staged.mjs'
  Invoke-Command -Session $session -ScriptBlock {
    Get-ScheduledTask -TaskName 'TaxiAssur Platform API' -ErrorAction Stop | Out-Null
    if (-not (Test-Path -LiteralPath 'F:\TaxiAssur\Api\taxiassur-platform-api.mjs')) { throw 'API introuvable sur le serveur.' }
  }
  Copy-Item -LiteralPath $source -Destination $stage -ToSession $session -Force
  $deployment = Invoke-Command -Session $session -ArgumentList $remote,$stage,$expected -ScriptBlock {
    param($Target, $Stage, $Expected)
    $ErrorActionPreference = 'Stop'
    if ((Get-FileHash -LiteralPath $Stage -Algorithm SHA256).Hash -ne $Expected) { throw 'Le fichier transfere ne correspond pas a la version locale.' }
    & 'C:\Program Files\nodejs\node.exe' --check $Stage
    if ($LASTEXITCODE -ne 0) { throw 'La syntaxe du fichier transfere est invalide.' }
    $backup = $Target + '.backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
    Copy-Item -LiteralPath $Target -Destination $backup
    function Restart-NativeApi {
      Stop-ScheduledTask -TaskName 'TaxiAssur Platform API' -ErrorAction SilentlyContinue
      Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
        Where-Object CommandLine -Like '*taxiassur-platform-api.mjs*' |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
      Start-ScheduledTask -TaskName 'TaxiAssur Platform API'
    }
    try {
      Copy-Item -LiteralPath $Stage -Destination $Target -Force
      Restart-NativeApi
      $health = $null
      for ($attempt = 0; $attempt -lt 10; $attempt++) {
        Start-Sleep -Seconds 2
        try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8796/health' -TimeoutSec 5; break } catch { }
      }
      if ($health.service -ne 'taxiassur-platform-api' -or $health.ok -ne $true) { throw 'Le controle de sante de l API native a echoue.' }
      $proxy = Invoke-RestMethod -Uri 'http://127.0.0.1:8791/platform/health' -TimeoutSec 15
      if ($proxy.service -ne 'taxiassur-platform-api' -or $proxy.ok -ne $true) { throw 'Le controle du proxy a echoue.' }
      if ((Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash -ne $Expected) { throw 'La version installee ne correspond pas au correctif.' }
      [pscustomobject]@{ backup = $backup; api_sha256 = $Expected; api_health = $health.service; proxy_health = $proxy.service }
    } catch {
      Copy-Item -LiteralPath $backup -Destination $Target -Force
      Restart-NativeApi
      throw
    }
  }
  $result.ok = $true
  $result.deployment = @{ backup=$deployment.backup; api_sha256=$deployment.api_sha256; api_health=$deployment.api_health; proxy_health=$deployment.proxy_health }
  Write-Host 'Correctif installe. API native et proxy verifies.' -ForegroundColor Green
} catch {
  $result.error = $_.Exception.Message
  Write-Host ('Installation non terminee : ' + $result.error) -ForegroundColor Red
} finally {
  if ($session) { Remove-PSSession $session }
  New-Item -ItemType Directory -Path (Split-Path -Parent $report) -Force | Out-Null
  $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $report -Encoding UTF8
  Write-Host "Rapport : $report"
}
if (-not $result.ok) { exit 1 }
