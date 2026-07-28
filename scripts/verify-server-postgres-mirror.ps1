param(
  [string]$Server = '192.168.1.70',
  [string]$DefaultUser = 'XCR\Administrateur',
  [string]$ReportPath = "$env:USERPROFILE\taxiassur-server-mirror-status-192-168-1-70.json"
)

$ErrorActionPreference = 'Stop'

function Step($Message) {
  Write-Host "[$(Get-Date -Format HH:mm:ss)] $Message"
}

function Save-Report($Report) {
  $Report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
}

Write-Host 'Verification miroir PostgreSQL TaxiAssur'
Write-Host "Serveur : $Server"
Write-Host 'Aucun mot de passe ne sera affiche ni sauvegarde.'
Write-Host ''

$credential = Get-Credential -UserName $DefaultUser -Message "Identifiants admin pour $Server"

try {
  Step 'Test WinRM'
  $session = New-PSSession -ComputerName $Server -Credential $credential
  Step 'OK - Session WinRM ouverte'

  $remote = Invoke-Command -Session $session -ScriptBlock {
    $ErrorActionPreference = 'Continue'
    $root = 'F:\TaxiAssur'
    $pgRoot = Join-Path $root 'PostgreSQL'
    $scriptsRoot = Join-Path $root 'Scripts'
    $secretsRoot = Join-Path $root 'Secrets'
    $backupsRoot = Join-Path $root 'Backups'

    $services = Get-Service | Where-Object {
      $_.Name -like '*Postgre*' -or $_.DisplayName -like '*Postgre*' -or $_.Name -like '*TaxiAssur*'
    } | Select-Object Name,DisplayName,Status,StartType

    $tasks = @()
    try {
      $tasks = Get-ScheduledTask | Where-Object {
        $_.TaskName -like '*TaxiAssur*' -or $_.TaskName -like '*Supabase*' -or $_.TaskName -like '*Postgre*' -or $_.TaskPath -like '*TaxiAssur*'
      } | ForEach-Object {
        $info = $null
        try { $info = Get-ScheduledTaskInfo -TaskName $_.TaskName -TaskPath $_.TaskPath } catch { }
        [pscustomobject]@{
          TaskName = $_.TaskName
          TaskPath = $_.TaskPath
          State = $_.State
          LastRunTime = $info.LastRunTime
          LastTaskResult = $info.LastTaskResult
          NextRunTime = $info.NextRunTime
        }
      }
    } catch { }

    $latestReports = @()
    if (Test-Path -LiteralPath $root) {
      $latestReports = Get-ChildItem -LiteralPath $root -Recurse -File -Include *.json -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 25 FullName,Length,LastWriteTime
    }

    $latestBackups = @()
    if (Test-Path -LiteralPath $backupsRoot) {
      $latestBackups = Get-ChildItem -LiteralPath $backupsRoot -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 25 FullName,Length,LastWriteTime
    }

    $syncScripts = @()
    if (Test-Path -LiteralPath $scriptsRoot) {
      $syncScripts = Get-ChildItem -LiteralPath $scriptsRoot -File -Filter '*sync*' -ErrorAction SilentlyContinue |
        Select-Object Name,Length,LastWriteTime
    }

    $drives = Get-PSDrive -PSProvider FileSystem | Select-Object Name,Used,Free,Root

    $pgBin = @(
      Join-Path $pgRoot 'bin\psql.exe',
      Join-Path $pgRoot 'bin\pg_isready.exe'
    ) | ForEach-Object {
      [pscustomobject]@{ Path = $_; Exists = Test-Path -LiteralPath $_ }
    }

    [pscustomobject]@{
      computerName = $env:COMPUTERNAME
      checkedAt = (Get-Date).ToString('o')
      paths = [ordered]@{
        root = [ordered]@{ path = $root; exists = Test-Path -LiteralPath $root }
        postgresql = [ordered]@{ path = $pgRoot; exists = Test-Path -LiteralPath $pgRoot }
        scripts = [ordered]@{ path = $scriptsRoot; exists = Test-Path -LiteralPath $scriptsRoot }
        secrets = [ordered]@{ path = $secretsRoot; exists = Test-Path -LiteralPath $secretsRoot }
        backups = [ordered]@{ path = $backupsRoot; exists = Test-Path -LiteralPath $backupsRoot }
      }
      services = $services
      scheduledTasks = $tasks
      latestReports = $latestReports
      latestBackups = $latestBackups
      syncScripts = $syncScripts
      postgresBinaries = $pgBin
      drives = $drives
    }
  }

  Remove-PSSession -Session $session

  $report = [ordered]@{
    ok = $true
    server = $Server
    checkedAt = (Get-Date).ToString('o')
    remote = $remote
  }
  Save-Report $report
  Step "Rapport ecrit : $ReportPath"
  Get-Content -LiteralPath $ReportPath -Raw
} catch {
  $report = [ordered]@{
    ok = $false
    server = $Server
    error = $_.Exception.Message
    checkedAt = (Get-Date).ToString('o')
  }
  Save-Report $report
  Write-Host "ERREUR : $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Rapport ecrit : $ReportPath"
  exit 1
}
