param(
  [string]$Server = '192.168.1.70',
  [string]$DefaultUser = 'XCR\Administrateur',
  [switch]$UseStoredCredentials,
  [switch]$RunNow
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$localSyncScript = Join-Path $repoRoot 'scripts\server-sync-supabase-rest-to-postgres.ps1'
$localBackupScript = Join-Path $repoRoot 'scripts\server-backup-taxiassur-postgres.ps1'
$remoteScriptsDir = "F:\TaxiAssur\Scripts"
$remoteSyncScript = "$remoteScriptsDir\sync-supabase-rest-to-postgres.ps1"
$remoteBackupScript = "$remoteScriptsDir\backup-taxiassur-postgres.ps1"
$taskName = 'TaxiAssur Supabase REST to PostgreSQL Sync'

function Step([string]$Message) {
  Write-Host "[$(Get-Date -Format HH:mm:ss)] $Message"
}

function Read-AdminCredential([string]$UserName) {
  Get-Credential -UserName $UserName -Message "Identifiants admin pour $Server"
}

function New-RemoteSession {
  if ($UseStoredCredentials) {
    return New-PSSession -ComputerName $Server -Authentication Negotiate
  }
  $credential = Read-AdminCredential $DefaultUser
  return New-PSSession -ComputerName $Server -Credential $credential -Authentication Negotiate
}

function Copy-WithSession([System.Management.Automation.Runspaces.PSSession]$Session, [string]$Source, [string]$Destination) {
  Copy-Item -LiteralPath $Source -Destination $Destination -ToSession $Session -Force
}

foreach ($file in @($localSyncScript, $localBackupScript)) {
  if (-not (Test-Path -LiteralPath $file)) { throw "Fichier local introuvable : $file" }
}

Write-Host 'Deploiement scripts PostgreSQL sync TaxiAssur'
Write-Host "Serveur : $Server"
Write-Host "Run now : $RunNow"
Write-Host ''

$session = $null
try {
  Step 'Ouverture session WinRM'
  $session = New-RemoteSession

  Step 'Preparation dossier distant'
  Invoke-Command -Session $session -ScriptBlock {
    param($RemoteScriptsDir)
    New-Item -ItemType Directory -Force -Path $RemoteScriptsDir | Out-Null
  } -ArgumentList $remoteScriptsDir

  Step 'Copie scripts corriges'
  Copy-WithSession $session $localSyncScript $remoteSyncScript
  Copy-WithSession $session $localBackupScript $remoteBackupScript

  Step 'Verification syntaxe distante'
  Invoke-Command -Session $session -ScriptBlock {
    $sync = 'F:\TaxiAssur\Scripts\sync-supabase-rest-to-postgres.ps1'
    $backup = 'F:\TaxiAssur\Scripts\backup-taxiassur-postgres.ps1'
    foreach ($file in @($sync, $backup)) {
      if (-not (Test-Path -LiteralPath $file)) { throw "Script distant introuvable : $file" }
      $null = [scriptblock]::Create((Get-Content -LiteralPath $file -Raw))
    }
  }

  if ($RunNow) {
    Step 'Lancement tache sync'
    Invoke-Command -Session $session -ScriptBlock {
      param($TaskName)
      Start-ScheduledTask -TaskName $TaskName
      Start-Sleep -Seconds 2
      $task = Get-ScheduledTask -TaskName $TaskName
      $info = Get-ScheduledTaskInfo -TaskName $TaskName
      [pscustomobject]@{
        task = $task.TaskName
        state = $task.State
        lastRunTime = $info.LastRunTime
        lastTaskResult = $info.LastTaskResult
      }
    } -ArgumentList $taskName | ConvertTo-Json -Depth 5
  }

  Step 'OK - scripts sync deployes'
} finally {
  if ($session) { Remove-PSSession -Session $session }
}
