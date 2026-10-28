param([switch]$PreflightOnly)
$ErrorActionPreference='Stop'
$canonicalRoot='F:\XCR-Continuity\taxi-generali'
if(Test-Path (Join-Path $canonicalRoot 'plan.json')){
 $scheduler=New-Object -ComObject Schedule.Service;$scheduler.Connect();$folder=$scheduler.GetFolder('\')
 $canonical=$folder.GetTask('TaxiAssur Generali Reprise')
 try{$duplicate=$folder.GetTask('TaxiAssur Generali Server Agent');$duplicate.Enabled=$false;$duplicate.Stop(0)}catch{}
 if(!$canonical.Enabled){throw 'canonical_generali_task_disabled_check_explicit_pause_before_resuming'}
 Write-Output 'Generali utilise la tache canonique TaxiAssur Generali Reprise. Aucun second agent installe.'
 return
}
$runtime='F:\TaxiAssur\Automation\Generali\server-runtime'
if(!$PreflightOnly){
 $proof=Get-Content (Join-Path $runtime 'preflight.json') -Raw|ConvertFrom-Json
 if(!$proof.ok -or !$proof.codex_verified -or !$proof.browser_verified -or !$proof.system_account){throw 'server_preflight_required'}
 & 'C:\Program Files\nodejs\node.exe' 'F:\TaxiAssur\Scripts\register-generali-server.mjs'
 if($LASTEXITCODE -ne 0){throw 'server_control_registration_failed'}
}
$service=New-Object -ComObject Schedule.Service;$service.Connect();$folder=$service.GetFolder('\')
$definition=$service.NewTask(0)
$definition.RegistrationInfo.Description='Reprise autonome Generali TaxiAssur sur serveur, sans Codex ouvert. Controle heures Paris 07h-21h.'
$definition.Principal.UserId='SYSTEM';$definition.Principal.LogonType=5;$definition.Principal.RunLevel=1
$definition.Settings.Enabled=$true;$definition.Settings.StartWhenAvailable=$true;$definition.Settings.MultipleInstances=2;$definition.Settings.ExecutionTimeLimit='PT45M'
$definition.Settings.DisallowStartIfOnBatteries=$false;$definition.Settings.StopIfGoingOnBatteries=$false
$action=$definition.Actions.Create(0);$action.Path='C:\Program Files\nodejs\node.exe';$action.Arguments='F:\TaxiAssur\Api\native-generali-agent.mjs';$action.WorkingDirectory='F:\TaxiAssur\Workspace'
$trigger=$definition.Triggers.Create(1)
if($PreflightOnly){$name='TaxiAssur Generali Server Preflight';$action.Arguments+=' --check';$trigger.StartBoundary=(Get-Date).AddMinutes(5).ToString('yyyy-MM-ddTHH:mm:ss')}
else{
 $name='TaxiAssur Generali Server Agent';$trigger.StartBoundary=(Get-Date).Date.AddHours((Get-Date).Hour+1).ToString('yyyy-MM-ddTHH:mm:ss');$trigger.Repetition.Interval='PT1H'
 $boot=$definition.Triggers.Create(8);$boot.Enabled=$true
}
$task=$folder.RegisterTaskDefinition($name,$definition,6,'SYSTEM',$null,5);$task.Run($null)|Out-Null
@{ok=$true;task=$name;account='SYSTEM';preflight_only=[bool]$PreflightOnly;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content (Join-Path $runtime 'task-install.json') -Encoding UTF8
