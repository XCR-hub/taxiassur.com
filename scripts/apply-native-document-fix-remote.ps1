param([Parameter(Mandatory=$true)][string]$ExpectedHash,[Parameter(Mandatory=$true)][string]$ReportPath)
$ErrorActionPreference = 'Stop'
$result = [ordered]@{ ok=$false; started_at=(Get-Date).ToString('o'); error=$null }
$target='F:\TaxiAssur\Api\taxiassur-platform-api.mjs'
$stage='F:\TaxiAssur\Api\taxiassur-platform-api.document-fix.staged.mjs'
$backup=$null
function Restart-NativeApi {
  Stop-ScheduledTask -TaskName 'TaxiAssur Platform API' -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object CommandLine -Like '*taxiassur-platform-api.mjs*' |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  Start-ScheduledTask -TaskName 'TaxiAssur Platform API'
}
try {
  if ((Get-FileHash -LiteralPath $stage -Algorithm SHA256).Hash -ne $ExpectedHash) { throw 'Staged API hash mismatch' }
  & 'C:\Program Files\nodejs\node.exe' --check $stage
  if ($LASTEXITCODE -ne 0) { throw 'API syntax check failed' }
  Get-ScheduledTask -TaskName 'TaxiAssur Platform API' -ErrorAction Stop | Out-Null
  $backup=$target+'.backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss')
  Copy-Item -LiteralPath $target -Destination $backup
  Copy-Item -LiteralPath $stage -Destination $target -Force
  Restart-NativeApi
  $health=$null
  for($attempt=0;$attempt -lt 10;$attempt++) {
    Start-Sleep -Seconds 2
    try { $health=Invoke-RestMethod -Uri 'http://127.0.0.1:8796/health' -TimeoutSec 5; break } catch { }
  }
  if($health.ok -ne $true -or $health.service -ne 'taxiassur-platform-api') { throw 'Native API health check failed' }
  $proxy=Invoke-RestMethod -Uri 'http://127.0.0.1:8791/platform/health' -TimeoutSec 15
  if($proxy.ok -ne $true -or $proxy.service -ne 'taxiassur-platform-api') { throw 'Platform proxy health check failed' }
  $actual=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
  if($actual -ne $ExpectedHash) { throw 'Installed API hash mismatch' }
  $validationReport=$ReportPath+'.validation.json'
  & 'C:\Program Files\nodejs\node.exe' 'F:\TaxiAssur\Scripts\verify-native-document-validation.mjs' $target $validationReport
  if($LASTEXITCODE -ne 0) { throw 'Native document validation PostgreSQL smoke test failed' }
  $validation=Get-Content -LiteralPath $validationReport -Raw | ConvertFrom-Json
  if(-not $validation.ok) { throw 'Native document validation PostgreSQL smoke test failed' }
  $result.ok=$true
  $result.api_sha256=$actual
  $result.backup=$backup
  $result.api_health=$health.service
  $result.proxy_health=$proxy.service
  $result.document_validation=$validation
} catch {
  $result.error=$_.Exception.Message
  if($backup -and (Test-Path -LiteralPath $backup)) {
    try { Copy-Item -LiteralPath $backup -Destination $target -Force; Restart-NativeApi; $result.rolled_back=$true }
    catch { $result.rolled_back=$false; $result.rollback_error=$_.Exception.Message }
  }
} finally {
  $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
}
if(-not $result.ok) { exit 1 }
