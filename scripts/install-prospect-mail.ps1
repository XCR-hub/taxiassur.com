$ErrorActionPreference='Stop'
$root='F:\TaxiAssur\Automation\ProspectMail'
if(!(Test-Path "$root\private\config.json")){throw 'Verified private mailbox configuration required'}
$taskName='XCR Prospect Mail Filing'
$task=New-Object -ComObject Schedule.Service
$task.Connect();$folder=$task.GetFolder('\');$d=$task.NewTask(0)
$d.RegistrationInfo.Description='Classement des mails Tony et Team ArchitecteAssur par prospect ; synchronisation privée TaxiAssur, sans envoi.'
$d.Principal.UserId='SYSTEM';$d.Principal.LogonType=5;$d.Principal.RunLevel=1
$d.Settings.Enabled=$true;$d.Settings.StartWhenAvailable=$true;$d.Settings.MultipleInstances=2;$d.Settings.ExecutionTimeLimit='PT30M'
$d.Settings.RestartCount=3;$d.Settings.RestartInterval='PT5M'
$a=$d.Actions.Create(0);$a.Path='C:\Program Files\nodejs\node.exe';$a.Arguments='F:\TaxiAssur\Api\prospect-mail-worker.mjs --apply';$a.WorkingDirectory='F:\TaxiAssur\Api'
$t=$d.Triggers.Create(1);$t.StartBoundary=(Get-Date).AddMinutes(15).ToString('yyyy-MM-ddTHH:mm:ss');$t.Repetition.Interval='PT15M'
$b=$d.Triggers.Create(8);$b.Enabled=$true;$b.Delay='PT2M'
$registered=$folder.RegisterTaskDefinition($taskName,$d,6,'SYSTEM',$null,5)
$registered.Run($null)|Out-Null
@{ok=$true;task=$taskName;interval_minutes=15;at=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content "$root\installed.json" -Encoding UTF8
