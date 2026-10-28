$ErrorActionPreference='Stop'
$scheduler=New-Object -ComObject Schedule.Service;$scheduler.Connect()
$definition=$scheduler.NewTask(0)
$definition.RegistrationInfo.Description='Copie les pieces jointes TaxiAssur apres rapprochement du prospect et controle antivirus. Aucune validation automatique ni envoi.'
$definition.Principal.UserId='SYSTEM';$definition.Principal.LogonType=5;$definition.Principal.RunLevel=1
$definition.Settings.Enabled=$true;$definition.Settings.StartWhenAvailable=$true;$definition.Settings.MultipleInstances=2;$definition.Settings.ExecutionTimeLimit='PT30M'
$definition.Settings.RestartCount=2;$definition.Settings.RestartInterval='PT5M'
$action=$definition.Actions.Create(0);$action.Path='C:\Program Files\nodejs\node.exe';$action.Arguments='F:\TaxiAssur\Api\prospect-mail-attachments.mjs';$action.WorkingDirectory='F:\TaxiAssur\Api'
$trigger=$definition.Triggers.Create(1);$trigger.StartBoundary=(Get-Date).AddMinutes(3).ToString('yyyy-MM-ddTHH:mm:ss');$trigger.Repetition.Interval='PT15M'
$boot=$definition.Triggers.Create(8);$boot.Enabled=$true;$boot.Delay='PT5M'
$task=$scheduler.GetFolder('\').RegisterTaskDefinition('TaxiAssur Prospect Mail Attachments',$definition,6,'SYSTEM',$null,5)
$task.Run($null)|Out-Null
@{ok=$true;task='TaxiAssur Prospect Mail Attachments';interval_minutes=15;account='SYSTEM';at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content 'F:\TaxiAssur\Automation\ProspectMail\attachments-installed.json' -Encoding UTF8
