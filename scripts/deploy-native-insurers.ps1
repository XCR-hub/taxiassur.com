param([Parameter(Mandatory=$true)][string]$ExpectedHash)
$ErrorActionPreference='Stop'
$api='F:\TaxiAssur\Api\taxiassur-platform-api.mjs'
$candidate='F:\TaxiAssur\Api\taxiassur-platform-api-insurer-candidate.mjs'
$backup=$null
$report='F:\TaxiAssur\Logs\insurer-api-deployment.json'
function Restart-PlatformApi {
 $scheduler=New-Object -ComObject Schedule.Service;$scheduler.Connect();$task=$scheduler.GetFolder('\').GetTask('TaxiAssur Platform API');$task.Stop(0)
 $listeners=Get-NetTCPConnection -LocalPort 8796 -State Listen -ErrorAction SilentlyContinue
 foreach($listener in $listeners){$owner=Get-CimInstance Win32_Process -Filter ('ProcessId='+$listener.OwningProcess);if($owner.CommandLine -notmatch 'taxiassur-platform-api\.mjs'){throw 'unexpected_api_process'};Stop-Process -Id $owner.ProcessId -Force}
 $task.Run($null)|Out-Null
 & 'C:\Program Files\nodejs\node.exe' 'F:\TaxiAssur\Scripts\wait-risk-api-ready.mjs' 'F:\TaxiAssur\Logs\insurer-api-readiness.json' new
 if($LASTEXITCODE -ne 0){throw 'api_not_ready'}
}
try{
 if(!(Get-Content 'F:\TaxiAssur\Logs\axa-candidate-check.json' -Raw|ConvertFrom-Json).ok){throw 'candidate_not_verified'}
 if(!(Get-Content 'F:\TaxiAssur\Automation\Insurers\dry-run.json' -Raw|ConvertFrom-Json).ok){throw 'worker_preflight_failed'}
 if((Get-FileHash $api).Hash -ne $ExpectedHash){throw 'production_changed'}
 & 'C:\Program Files\nodejs\node.exe' --check $candidate
 if($LASTEXITCODE -ne 0){throw 'candidate_syntax_failed'}
 $backup='F:\TaxiAssur\Api\taxiassur-platform-api.pre-insurers-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.mjs'
 Copy-Item -LiteralPath $api -Destination $backup
 Copy-Item -LiteralPath $candidate -Destination $api -Force
 Restart-PlatformApi
 & 'F:\TaxiAssur\Scripts\install-native-insurers.ps1'
 @{ok=$true;backup=$backup;sha256=(Get-FileHash $api).Hash;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content $report -Encoding UTF8
}catch{
 $failure=$_.Exception.Message;$rolledBack=$false
 if($backup){Copy-Item -LiteralPath $backup -Destination $api -Force;try{Restart-PlatformApi;$rolledBack=$true}catch{}}
 @{ok=$false;error=$failure;rollback_healthy=$rolledBack;backup=$backup}|ConvertTo-Json|Set-Content $report -Encoding UTF8
}
