param([string]$Server='192.168.1.70',[string]$UserName='XCR\Administrateur')
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$report=Join-Path $repo 'reports\native-api-deployment.json'
$result=[ordered]@{ok=$false;server=$Server;checked_at=(Get-Date).ToString('o');error=$null}
$drive=$null
try {
  $source=Join-Path $repo 'server\taxiassur-platform-api.mjs'
  & node --check $source
  if($LASTEXITCODE -ne 0) { throw 'Local API syntax check failed' }
  $expected=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
  Write-Host "Connexion administrative au serveur $Server ($UserName)."
  $securePassword=Read-Host 'Mot de passe Windows (saisie masquee)' -AsSecureString
  $credential=[PSCredential]::new($UserName,$securePassword)
  $drive=New-PSDrive -Name TaxiAssurFix -PSProvider FileSystem -Root "\\$Server\f$\TaxiAssur" -Credential $credential
  if(-not(Test-Path -LiteralPath 'TaxiAssurFix:\Api\taxiassur-platform-api.mjs')) { throw 'Server API file not found' }
  $previous=(Get-FileHash -LiteralPath 'TaxiAssurFix:\Api\taxiassur-platform-api.mjs' -Algorithm SHA256).Hash
  Copy-Item -LiteralPath $source -Destination 'TaxiAssurFix:\Api\taxiassur-platform-api.document-fix.staged.mjs' -Force
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'apply-native-document-fix-remote.ps1') -Destination 'TaxiAssurFix:\Scripts\apply-native-document-fix-remote.ps1' -Force
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'verify-native-document-validation.mjs') -Destination 'TaxiAssurFix:\Scripts\verify-native-document-validation.mjs' -Force
  $reportName='native-document-fix-'+[guid]::NewGuid().ToString('N')+'.json'
  $remoteReport='F:\TaxiAssur\Logs\'+$reportName
  $command='powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "F:\TaxiAssur\Scripts\apply-native-document-fix-remote.ps1" -ExpectedHash '+$expected+' -ReportPath "'+$remoteReport+'"'
  $launch=Invoke-WmiMethod -ComputerName $Server -Credential $credential -Class Win32_Process -Name Create -ArgumentList $command
  if($launch.ReturnValue -ne 0) { throw ('Remote deployment launch failed: '+$launch.ReturnValue) }
  $networkReport='TaxiAssurFix:\Logs\'+$reportName
  for($attempt=0;$attempt -lt 40;$attempt++) {
    if(Test-Path -LiteralPath $networkReport) { break }
    Start-Sleep -Seconds 3
  }
  if(-not(Test-Path -LiteralPath $networkReport)) { throw 'Remote deployment report not available; verify the server before retrying.' }
  $deployment=Get-Content -LiteralPath $networkReport -Raw | ConvertFrom-Json
  $result.deployment=$deployment
  $result.previous_sha256=$previous
  if(-not $deployment.ok) { throw $deployment.error }
  $result.ok=$true
  Write-Host 'Correctif installe. API native et proxy verifies.' -ForegroundColor Green
} catch {
  $result.error=$_.Exception.Message
  Write-Host ('Installation non terminee : '+$result.error) -ForegroundColor Red
} finally {
  if($drive) { Remove-PSDrive -Name TaxiAssurFix -Force }
  New-Item -ItemType Directory -Path (Split-Path -Parent $report) -Force | Out-Null
  $result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $report -Encoding UTF8
  Write-Host "Rapport : $report"
}
if(-not $result.ok) { exit 1 }
