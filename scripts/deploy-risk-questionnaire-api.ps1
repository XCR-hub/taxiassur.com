param([Parameter(Mandatory=$true)][string]$ExpectedHash)
$ErrorActionPreference='Stop'
$api='F:\TaxiAssur\Api\taxiassur-platform-api.mjs'
$candidate='F:\TaxiAssur\Api\taxiassur-platform-api-risk-candidate.mjs'
$report='F:\TaxiAssur\Logs\risk-questionnaire-api-deployment.json'
$backup=$null
function Stop-ApiOwner {
 $listener=Get-NetTCPConnection -LocalPort 8796 -State Listen -ErrorAction SilentlyContinue|Select-Object -First 1
 if($listener){$owner=Get-CimInstance Win32_Process -Filter ('ProcessId='+$listener.OwningProcess);if($owner.CommandLine -notmatch 'taxiassur-platform-api\.mjs'){throw 'unexpected_api_process'};Stop-Process -Id $owner.ProcessId -Force}
}
function Wait-Api {
 for($i=0;$i -lt 20;$i++){try{$r=Invoke-RestMethod 'http://127.0.0.1:8796/health' -TimeoutSec 2;if($r.service -eq 'taxiassur-platform-api'){return $true}}catch{};Start-Sleep -Seconds 1};return $false
}
try {
 $checks=Get-Content 'F:\TaxiAssur\Logs\risk-questionnaire-candidate-check.json' -Raw|ConvertFrom-Json
 if(!$checks.ok){throw 'candidate_not_verified'}
 if((Get-FileHash $api -Algorithm SHA256).Hash -ne $ExpectedHash){throw 'production_changed_since_review'}
 & 'C:\Program Files\nodejs\node.exe' --check $candidate
 if($LASTEXITCODE -ne 0){throw 'candidate_syntax_invalid'}
 $backup='F:\TaxiAssur\Api\taxiassur-platform-api.pre-risk-'+(Get-Date -Format yyyyMMdd-HHmmss)+'.mjs'
 Copy-Item -LiteralPath $api -Destination $backup
 Copy-Item -LiteralPath $candidate -Destination $api -Force
 Stop-ApiOwner
 if(!(Wait-Api)){throw 'api_restart_failed'}
 $status=0;try{Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8796/v1/prospect/risk-questionnaire' -TimeoutSec 10|Out-Null}catch{$status=[int]$_.Exception.Response.StatusCode}
 if($status -ne 401){throw ('unexpected_new_route_status_'+$status)}
 @{ok=$true;backup=$backup;api_sha256=(Get-FileHash $api -Algorithm SHA256).Hash;questionnaire_unauthenticated_status=$status;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content $report -Encoding UTF8
}catch{
 $failure=$_.Exception.Message;$rolledBack=$false
 if($backup){Copy-Item -LiteralPath $backup -Destination $api -Force;Stop-ApiOwner;$rolledBack=Wait-Api}
 @{ok=$false;error=$failure;rollback_healthy=$rolledBack;backup=$backup}|ConvertTo-Json|Set-Content $report -Encoding UTF8
}
