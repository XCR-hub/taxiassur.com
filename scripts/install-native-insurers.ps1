param([switch]$PreflightOnly)
$ErrorActionPreference='Stop'
$service=New-Object -ComObject Schedule.Service
$service.Connect()
$folder=$service.GetFolder('\')
$definition=$service.NewTask(0)
$definition.RegistrationInfo.Description='Dossiers AXA taxi complets, pièces vérifiées et suivi des réponses. Compte assureur Tony CERDA.'
$definition.Principal.UserId='SYSTEM'
$definition.Principal.LogonType=5
$definition.Principal.RunLevel=1
$definition.Settings.Enabled=$true
$definition.Settings.StartWhenAvailable=$true
$definition.Settings.MultipleInstances=2
$definition.Settings.ExecutionTimeLimit='PT20M'
$action=$definition.Actions.Create(0)
$action.Path='C:\Program Files\nodejs\node.exe'
$action.Arguments='F:\TaxiAssur\Api\native-insurer-worker.mjs'
$action.WorkingDirectory='F:\TaxiAssur\Api'
$trigger=$definition.Triggers.Create(1)
$trigger.StartBoundary=(Get-Date).AddSeconds(15).ToString('yyyy-MM-ddTHH:mm:ss')
if($PreflightOnly){$name='TaxiAssur Insurer Preflight';$action.Arguments+=' --dry-run'}
else{$name='TaxiAssur Native Insurer Quotes';$trigger.Repetition.Interval='PT5M';$boot=$definition.Triggers.Create(8);$boot.Enabled=$true}
$task=$folder.RegisterTaskDefinition($name,$definition,6,'SYSTEM',$null,5)
$task.Run($null)|Out-Null
@{ok=$true;task=$name;account='SYSTEM';preflight_only=[bool]$PreflightOnly;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content 'F:\TaxiAssur\Logs\insurer-task-install.json' -Encoding UTF8
