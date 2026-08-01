param(
  [string]$Server = '192.168.1.70',
  [string]$DefaultUser = 'XCR\Administrateur',
  [switch]$UseStoredCredentials,
  [string]$ReportPath = "$env:USERPROFILE\taxiassur-server-mirror-status-192-168-1-70.json",
  [int]$ExpectedSyncIntervalMinutes = 60,
  [int]$MaxSyncAgeHours = 4,
  [int]$MaxRunningSyncHours = 3,
  [int]$MinDataDriveFreeGB = 20,
  [int64]$MinPostgresBackupBytes = 10485760,
  [switch]$PrintRawReport
)

$ErrorActionPreference = 'Stop'

function Step([string]$Message) {
  Write-Host "[$(Get-Date -Format HH:mm:ss)] $Message"
}

function Read-AdminCredential([string]$UserName) {
  Get-Credential -UserName $UserName -Message "Identifiants admin pour $Server"
}

function Save-Report($Report) {
  $Report | ConvertTo-Json -Depth 14 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
}

function Add-Check($Checks, [string]$Name, [bool]$Ok, $Details) {
  $Checks.Add([pscustomobject]@{
    name = $Name
    ok = $Ok
    details = $Details
  }) | Out-Null
}

function Get-Prop($Object, [string]$Name) {
  if ($null -eq $Object) { return $null }
  if ($Object -is [System.Collections.IDictionary] -and $Object.Contains($Name)) {
    return $Object[$Name]
  }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) { return $null }
  return $property.Value
}

function Convert-IsoDurationToMinutes($Value) {
  if ($null -eq $Value) { return $null }
  $text = [string]$Value
  if ($text -match '^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$') {
    $hours = 0
    $minutes = 0
    if ($matches[1]) { $hours = [int]$matches[1] }
    if ($matches[2]) { $minutes = [int]$matches[2] }
    return ($hours * 60) + $minutes
  }
  try {
    $span = [TimeSpan]::Parse($text)
    return [int][math]::Round($span.TotalMinutes)
  } catch {
    return $null
  }
}

function Get-AgeHours($Value) {
  if ($null -eq $Value) { return $null }
  try {
    if ($Value -is [DateTime]) {
      if ($Value -eq [DateTime]::MinValue) { return $null }
      return [math]::Round(((Get-Date) - $Value).TotalHours, 2)
    }
    $dto = [DateTimeOffset]::Parse([string]$Value)
    return [math]::Round(([DateTimeOffset]::Now - $dto).TotalHours, 2)
  } catch {
    return $null
  }
}

function Test-StatusRunning($Value) {
  return ([string]$Value) -eq 'Running'
}

Write-Host 'Verification miroir PostgreSQL TaxiAssur'
Write-Host "Serveur : $Server"
Write-Host 'Aucun mot de passe ne sera affiche ni sauvegarde.'
Write-Host ''

$credential = if ($UseStoredCredentials) { $null } else { Read-AdminCredential $DefaultUser }
$session = $null

try {
  Step 'Test WinRM'
  $sessionParams = @{ ComputerName = $Server; Authentication = 'Negotiate' }
  if ($credential) { $sessionParams.Credential = $credential }
  $session = New-PSSession @sessionParams
  Step 'OK - Session WinRM ouverte'

  $remote = Invoke-Command -Session $session -ScriptBlock {
    $ErrorActionPreference = 'Continue'
    $root = 'F:\TaxiAssur'
    $pgRoot = Join-Path $root 'PostgreSQL'
    $pgRuntimeRoot = Join-Path $pgRoot 'runtime\pgsql'
    $scriptsRoot = Join-Path $root 'Scripts'
    $secretsRoot = Join-Path $root 'Secrets'
    $backupsRoot = Join-Path $root 'Backups'
    $logsRoot = Join-Path $root 'Logs'
    $syncTaskName = 'TaxiAssur Supabase REST to PostgreSQL Sync'
    $syncReportPath = Join-Path $logsRoot 'supabase-postgres-sync-latest.json'
    $postgresBackupRoot = Join-Path $backupsRoot 'PostgreSQL'

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
          State = $_.State.ToString()
          LastRunTime = $info.LastRunTime
          LastTaskResult = $info.LastTaskResult
          NextRunTime = $info.NextRunTime
        }
      }
    } catch { }

    $syncTask = [ordered]@{
      exists = $false
      name = $syncTaskName
      state = $null
      lastRunTime = $null
      lastTaskResult = $null
      nextRunTime = $null
      repetitionInterval = $null
      repetitionDuration = $null
      multipleInstances = $null
      startWhenAvailable = $null
      executionTimeLimit = $null
      actionExecute = $null
      actionArguments = $null
    }
    try {
      $task = Get-ScheduledTask -TaskName $syncTaskName -ErrorAction Stop
      $info = Get-ScheduledTaskInfo -TaskName $syncTaskName -ErrorAction Stop
      $trigger = @($task.Triggers) | Select-Object -First 1
      $action = @($task.Actions) | Select-Object -First 1
      $syncTask.exists = $true
      $syncTask.state = $task.State.ToString()
      $syncTask.lastRunTime = $info.LastRunTime
      $syncTask.lastTaskResult = $info.LastTaskResult
      $syncTask.nextRunTime = $info.NextRunTime
      if ($trigger -and $trigger.Repetition) {
        $syncTask.repetitionInterval = [string]$trigger.Repetition.Interval
        $syncTask.repetitionDuration = [string]$trigger.Repetition.Duration
      }
      if ($task.Settings) {
        $syncTask.multipleInstances = [string]$task.Settings.MultipleInstances
        $syncTask.startWhenAvailable = [bool]$task.Settings.StartWhenAvailable
        $syncTask.executionTimeLimit = [string]$task.Settings.ExecutionTimeLimit
      }
      if ($action) {
        $syncTask.actionExecute = [string]$action.Execute
        $syncTask.actionArguments = [string]$action.Arguments
      }
    } catch { }

    $syncReport = [ordered]@{
      exists = Test-Path -LiteralPath $syncReportPath
      path = $syncReportPath
      parseError = $null
      status = $null
      startedAt = $null
      finishedAt = $null
      backupRoot = $null
      totalTables = $null
      tablesOk = $null
      tablesFailed = $null
      rows = $null
      jsonbRows = $null
      invalidJsonRows = $null
      failureCount = $null
      latestPostgresBackups = @()
    }
    if ($syncReport.exists) {
      try {
        $parsed = Get-Content -Raw -LiteralPath $syncReportPath | ConvertFrom-Json
        $syncReport.status = $parsed.status
        $syncReport.startedAt = $parsed.started_at
        $syncReport.finishedAt = $parsed.finished_at
        $syncReport.backupRoot = $parsed.backup_root
        if ($parsed.totals) {
          $syncReport.totalTables = $parsed.totals.tables
          $syncReport.tablesOk = $parsed.totals.ok
          $syncReport.tablesFailed = $parsed.totals.failed
          $syncReport.rows = $parsed.totals.rows
          $syncReport.jsonbRows = $parsed.totals.jsonb_rows
          $syncReport.invalidJsonRows = $parsed.totals.invalid_json_rows
        }
        $syncReport.failureCount = @($parsed.failures).Count
        $syncReport.latestPostgresBackups = @($parsed.latest_postgres_backups)
      } catch {
        $syncReport.parseError = $_.Exception.Message
      }
    }

    $latestPgBackup = $null
    if (Test-Path -LiteralPath $postgresBackupRoot) {
      $latestPgBackup = Get-ChildItem -LiteralPath $postgresBackupRoot -Filter 'taxiassur_*.dump' -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 FullName,Name,Length,LastWriteTime
    }

    $latestReports = @()
    if (Test-Path -LiteralPath $logsRoot) {
      $latestReports = Get-ChildItem -LiteralPath $logsRoot -File -Filter '*.json' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 10 FullName,Length,LastWriteTime
    }

    $latestBackups = @()
    if (Test-Path -LiteralPath $backupsRoot) {
      $latestBackups = Get-ChildItem -LiteralPath $backupsRoot -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 10 FullName,Length,LastWriteTime
    }

    $syncScripts = @()
    if (Test-Path -LiteralPath $scriptsRoot) {
      $syncScripts = Get-ChildItem -LiteralPath $scriptsRoot -File -Filter '*sync*' -ErrorAction SilentlyContinue |
        Select-Object Name,Length,LastWriteTime
    }

    $drives = Get-PSDrive -PSProvider FileSystem | Select-Object Name,Used,Free,Root

    $pgBin = @(
      (Join-Path $pgRuntimeRoot 'bin\psql.exe'),
      (Join-Path $pgRuntimeRoot 'bin\pg_isready.exe'),
      (Join-Path $pgRuntimeRoot 'bin\pg_dump.exe')
    ) | ForEach-Object {
      [pscustomobject]@{ Path = $_; Exists = Test-Path -LiteralPath $_ }
    }

    [pscustomobject]@{
      computerName = $env:COMPUTERNAME
      checkedAt = (Get-Date).ToString('o')
      paths = [ordered]@{
        root = [ordered]@{ path = $root; exists = Test-Path -LiteralPath $root }
        postgresql = [ordered]@{ path = $pgRoot; exists = Test-Path -LiteralPath $pgRoot }
        postgresqlRuntime = [ordered]@{ path = $pgRuntimeRoot; exists = Test-Path -LiteralPath $pgRuntimeRoot }
        scripts = [ordered]@{ path = $scriptsRoot; exists = Test-Path -LiteralPath $scriptsRoot }
        secrets = [ordered]@{ path = $secretsRoot; exists = Test-Path -LiteralPath $secretsRoot }
        backups = [ordered]@{ path = $backupsRoot; exists = Test-Path -LiteralPath $backupsRoot }
        logs = [ordered]@{ path = $logsRoot; exists = Test-Path -LiteralPath $logsRoot }
      }
      services = $services
      scheduledTasks = $tasks
      syncTask = $syncTask
      syncReport = $syncReport
      latestPostgresBackup = $latestPgBackup
      latestReports = $latestReports
      latestBackups = $latestBackups
      syncScripts = $syncScripts
      postgresBinaries = $pgBin
      drives = $drives
    }
  }

  if ($session) {
    Remove-PSSession -Session $session
    $session = $null
  }

  $checks = New-Object System.Collections.Generic.List[object]

  Add-Check $checks 'remote computer name is available' (-not [string]::IsNullOrWhiteSpace($remote.computerName)) ([ordered]@{ computerName = $remote.computerName })

  foreach ($pathName in @('root','postgresql','postgresqlRuntime','scripts','secrets','backups','logs')) {
    $pathInfo = Get-Prop $remote.paths $pathName
    Add-Check $checks "server path exists: $pathName" ([bool](Get-Prop $pathInfo 'exists')) $pathInfo
  }

  $postgresServices = @($remote.services) | Where-Object { $_.Name -like '*Postgre*' -or $_.DisplayName -like '*Postgre*' }
  $postgresRunning = @($postgresServices | Where-Object { Test-StatusRunning $_.Status }).Count -gt 0
  Add-Check $checks 'PostgreSQL service is running' $postgresRunning ([ordered]@{ services = $postgresServices })

  $binaries = @($remote.postgresBinaries)
  $missingBinaries = @($binaries | Where-Object { -not $_.Exists })
  Add-Check $checks 'PostgreSQL runtime binaries exist' ($binaries.Count -gt 0 -and $missingBinaries.Count -eq 0) ([ordered]@{ binaries = $binaries; missing = $missingBinaries })

  $syncTask = $remote.syncTask
  $syncState = [string](Get-Prop $syncTask 'state')
  $syncLastTaskResult = Get-Prop $syncTask 'lastTaskResult'
  $syncIntervalMinutes = Convert-IsoDurationToMinutes (Get-Prop $syncTask 'repetitionInterval')
  $syncLastRunAgeHours = Get-AgeHours (Get-Prop $syncTask 'lastRunTime')
  $syncTaskHealthyResult = ($syncState -eq 'Running' -and [int]$syncLastTaskResult -eq 267009) -or ([int]$syncLastTaskResult -eq 0)
  $syncStateHealthy = $syncState -eq 'Ready' -or $syncState -eq 'Running'
  $syncRunningAgeOk = $true
  if ($syncState -eq 'Running' -and $null -ne $syncLastRunAgeHours) {
    $syncRunningAgeOk = $syncLastRunAgeHours -le $MaxRunningSyncHours
  }

  Add-Check $checks 'hourly sync scheduled task exists' ([bool](Get-Prop $syncTask 'exists')) $syncTask
  Add-Check $checks 'hourly sync scheduled task state is healthy' $syncStateHealthy ([ordered]@{ state = $syncState; allowed = @('Ready','Running') })
  Add-Check $checks 'hourly sync scheduled task last result is healthy' $syncTaskHealthyResult ([ordered]@{ state = $syncState; lastTaskResult = $syncLastTaskResult; runningCode = 267009 })
  Add-Check $checks 'hourly sync interval matches expectation' ($syncIntervalMinutes -eq $ExpectedSyncIntervalMinutes) ([ordered]@{ expectedMinutes = $ExpectedSyncIntervalMinutes; actualMinutes = $syncIntervalMinutes; raw = Get-Prop $syncTask 'repetitionInterval' })
  Add-Check $checks 'hourly sync avoids overlapping runs' (([string](Get-Prop $syncTask 'multipleInstances')) -eq 'IgnoreNew') ([ordered]@{ multipleInstances = Get-Prop $syncTask 'multipleInstances' })
  Add-Check $checks 'running sync is not older than execution limit' $syncRunningAgeOk ([ordered]@{ state = $syncState; lastRunAgeHours = $syncLastRunAgeHours; maxRunningSyncHours = $MaxRunningSyncHours })

  $syncReport = $remote.syncReport
  $syncFinishedAgeHours = Get-AgeHours (Get-Prop $syncReport 'finishedAt')
  $syncReportFresh = $null -ne $syncFinishedAgeHours -and $syncFinishedAgeHours -le $MaxSyncAgeHours
  $syncReportRows = Get-Prop $syncReport 'rows'
  $syncReportFailed = Get-Prop $syncReport 'tablesFailed'
  $syncReportInvalidJson = Get-Prop $syncReport 'invalidJsonRows'
  $syncReportTables = Get-Prop $syncReport 'totalTables'
  $syncReportOkTables = Get-Prop $syncReport 'tablesOk'

  Add-Check $checks 'latest sync report exists' ([bool](Get-Prop $syncReport 'exists')) ([ordered]@{ path = Get-Prop $syncReport 'path' })
  Add-Check $checks 'latest sync report parses as JSON' ([string]::IsNullOrWhiteSpace([string](Get-Prop $syncReport 'parseError'))) ([ordered]@{ parseError = Get-Prop $syncReport 'parseError' })
  Add-Check $checks 'latest sync status is ok' (([string](Get-Prop $syncReport 'status')) -eq 'ok') ([ordered]@{ status = Get-Prop $syncReport 'status'; startedAt = Get-Prop $syncReport 'startedAt'; finishedAt = Get-Prop $syncReport 'finishedAt' })
  Add-Check $checks 'latest sync has no failed tables' ([int64]$syncReportFailed -eq 0) ([ordered]@{ failed = $syncReportFailed; failureCount = Get-Prop $syncReport 'failureCount' })
  Add-Check $checks 'latest sync imported every configured table' ([int64]$syncReportTables -gt 0 -and [int64]$syncReportOkTables -eq [int64]$syncReportTables) ([ordered]@{ tables = $syncReportTables; ok = $syncReportOkTables })
  Add-Check $checks 'latest sync imported rows' ([int64]$syncReportRows -gt 0) ([ordered]@{ rows = $syncReportRows; jsonbRows = Get-Prop $syncReport 'jsonbRows' })
  Add-Check $checks 'latest sync has no invalid JSON rows' ([int64]$syncReportInvalidJson -eq 0) ([ordered]@{ invalidJsonRows = $syncReportInvalidJson })
  Add-Check $checks 'latest sync report is fresh' $syncReportFresh ([ordered]@{ finishedAt = Get-Prop $syncReport 'finishedAt'; ageHours = $syncFinishedAgeHours; maxAgeHours = $MaxSyncAgeHours })

  $latestBackup = $remote.latestPostgresBackup
  $backupAgeHours = Get-AgeHours (Get-Prop $latestBackup 'LastWriteTime')
  $backupExists = $null -ne $latestBackup -and -not [string]::IsNullOrWhiteSpace([string](Get-Prop $latestBackup 'FullName'))
  $backupLargeEnough = $backupExists -and [int64](Get-Prop $latestBackup 'Length') -ge $MinPostgresBackupBytes
  $backupFresh = $backupExists -and $null -ne $backupAgeHours -and $backupAgeHours -le $MaxSyncAgeHours
  Add-Check $checks 'latest PostgreSQL dump exists' $backupExists $latestBackup
  Add-Check $checks 'latest PostgreSQL dump is non-trivial' $backupLargeEnough ([ordered]@{ length = Get-Prop $latestBackup 'Length'; minimumBytes = $MinPostgresBackupBytes; name = Get-Prop $latestBackup 'Name' })
  Add-Check $checks 'latest PostgreSQL dump is fresh' $backupFresh ([ordered]@{ lastWriteTime = Get-Prop $latestBackup 'LastWriteTime'; ageHours = $backupAgeHours; maxAgeHours = $MaxSyncAgeHours })

  $fDrive = @($remote.drives) | Where-Object { $_.Name -eq 'F' } | Select-Object -First 1
  $freeGb = $null
  if ($fDrive -and $null -ne $fDrive.Free) { $freeGb = [math]::Round(([double]$fDrive.Free / 1GB), 2) }
  Add-Check $checks 'server data drive has enough free space' ($null -ne $freeGb -and $freeGb -ge $MinDataDriveFreeGB) ([ordered]@{ drive = 'F'; freeGb = $freeGb; minimumGb = $MinDataDriveFreeGB })

  $failedChecks = @($checks | Where-Object { -not $_.ok })
  $reportOk = $failedChecks.Count -eq 0
  $summary = [ordered]@{
    computerName = $remote.computerName
    syncTaskState = $syncState
    syncIntervalMinutes = $syncIntervalMinutes
    latestSyncStatus = Get-Prop $syncReport 'status'
    latestSyncFinishedAt = Get-Prop $syncReport 'finishedAt'
    latestSyncAgeHours = $syncFinishedAgeHours
    latestSyncRows = $syncReportRows
    latestSyncTables = $syncReportTables
    latestSyncFailedTables = $syncReportFailed
    latestBackupName = Get-Prop $latestBackup 'Name'
    latestBackupAgeHours = $backupAgeHours
    dataDriveFreeGb = $freeGb
  }

  $report = [ordered]@{
    ok = $reportOk
    server = $Server
    checkedAt = (Get-Date).ToString('o')
    summary = $summary
    checks = $checks
    remote = $remote
  }
  Save-Report $report

  Step "Rapport ecrit : $ReportPath"
  foreach ($check in $checks) {
    if ($check.ok) {
      Write-Host "OK  - $($check.name)"
    } else {
      Write-Host "ERR - $($check.name)" -ForegroundColor Red
    }
  }

  Write-Host ''
  Write-Host ("Resume : sync {0}, {1} tables, {2} lignes, age {3}h, backup {4}, F: libre {5} Go" -f $summary.latestSyncStatus,$summary.latestSyncTables,$summary.latestSyncRows,$summary.latestSyncAgeHours,$summary.latestBackupName,$summary.dataDriveFreeGb)

  if ($PrintRawReport) {
    Get-Content -LiteralPath $ReportPath -Raw
  }

  if (-not $reportOk) { exit 1 }
} catch {
  if ($session) { Remove-PSSession -Session $session -ErrorAction SilentlyContinue }
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