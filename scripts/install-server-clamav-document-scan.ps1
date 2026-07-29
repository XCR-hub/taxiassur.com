param(
  [string]$Server = '192.168.1.70',
  [string]$DefaultUser = 'XCR\Administrateur',
  [switch]$UseStoredCredentials,
  [string]$RemoteBase = 'F:\TaxiAssur',
  [int]$IntervalMinutes = 10,
  [int]$ScanLimit = 25,
  [string]$ClamScanPath = '',
  [switch]$RunNow,
  [string]$ReportPath = "$env:USERPROFILE\taxiassur-clamav-document-scan-install-192-168-1-70.json"
)

$ErrorActionPreference = 'Stop'

function Read-AdminCredential([string]$DefaultUser) {
  $user = Read-Host "Utilisateur admin serveur [$DefaultUser]"
  if ([string]::IsNullOrWhiteSpace($user)) { $user = $DefaultUser }
  $password = Read-Host "Mot de passe admin serveur" -AsSecureString
  return [pscredential]::new($user, $password)
}

function Step([string]$Message) {
  Write-Host "[$(Get-Date -Format HH:mm:ss)] $Message"
}

function Save-Report($Report) {
  $Report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$localWorker = Join-Path $repoRoot 'scripts\scan-supabase-documents-clamav.cjs'
if (-not (Test-Path -LiteralPath $localWorker)) { throw "Local worker not found: $localWorker" }

Write-Host 'Installation du scan antivirus documents TaxiAssur'
Write-Host "Serveur : $Server"
Write-Host "Tache : TaxiAssurDocumentClamAVScan, toutes les $IntervalMinutes minutes"
Write-Host 'Aucune cle ne sera affichee. Les secrets restent dans F:\TaxiAssur\Secrets.'
Write-Host ''

$credential = if ($UseStoredCredentials) { $null } else { Read-AdminCredential -DefaultUser $DefaultUser }

$report = [ordered]@{
  ok = $false
  server = $Server
  started_at = (Get-Date).ToString('o')
  steps = @()
  result = $null
}

function Add-Step([string]$Name, [bool]$Ok, [string]$Message) {
  $report.steps += [ordered]@{ name = $Name; ok = $Ok; message = $Message }
}

try {
  Step 'Ouverture session WinRM'
  $sessionParams = @{ ComputerName = $Server; Authentication = 'Negotiate' }
  if ($credential) { $sessionParams.Credential = $credential }
  $session = New-PSSession @sessionParams
  Add-Step 'WinRM session' $true 'Session opened'

  try {
    Step 'Preparation dossiers distants'
    Invoke-Command -Session $session -ArgumentList $RemoteBase -ScriptBlock {
      param($RemoteBase)
      foreach ($dir in @(
        (Join-Path $RemoteBase 'Scripts'),
        (Join-Path $RemoteBase 'Secrets'),
        (Join-Path $RemoteBase 'Logs'),
        (Join-Path $RemoteBase 'Temp'),
        (Join-Path $RemoteBase 'ClamAV\db')
      )) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
      }
    }
    Add-Step 'Remote directories' $true 'Scripts/Secrets/Logs/Temp ready'

    Step 'Copie du worker ClamAV'
    Copy-Item -LiteralPath $localWorker -Destination ($RemoteBase.TrimEnd('\') + '\Scripts\scan-supabase-documents-clamav.cjs') -ToSession $session -Force
    Add-Step 'Worker copied' $true 'scan-supabase-documents-clamav.cjs copied'

    Step 'Configuration distante de la tache planifiee'
    $remoteResult = Invoke-Command -Session $session -ArgumentList $RemoteBase,$IntervalMinutes,$ScanLimit,$ClamScanPath,[bool]$RunNow -ScriptBlock {
      param($RemoteBase,$IntervalMinutes,$ScanLimit,$ClamScanPath,$RunNow)
      $ErrorActionPreference = 'Stop'

      function Read-EnvFile([string]$Path) {
        $out = @{}
        if (-not (Test-Path -LiteralPath $Path)) { return $out }
        foreach ($raw in Get-Content -LiteralPath $Path) {
          $line = $raw.Trim()
          if (-not $line -or $line.StartsWith('#')) { continue }
          $idx = $line.IndexOf('=')
          if ($idx -le 0) { continue }
          $key = $line.Substring(0, $idx).Trim()
          $value = $line.Substring($idx + 1).Trim()
          $out[$key] = $value
        }
        return $out
      }

      function Merge-Value($Target, [string]$Key, $Sources) {
        if ($Target.ContainsKey($Key) -and -not [string]::IsNullOrWhiteSpace($Target[$Key])) { return }
        foreach ($source in $Sources) {
          if ($source.ContainsKey($Key) -and -not [string]::IsNullOrWhiteSpace($source[$Key])) {
            $Target[$Key] = $source[$Key]
            return
          }
        }
      }

      function Find-Executable([string[]]$Candidates, [string]$CommandName) {
        foreach ($candidate in $Candidates) {
          if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
          if (Test-Path -LiteralPath $candidate) { return (Resolve-Path -LiteralPath $candidate).Path }
        }

        $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
        if ($cmd -and $cmd.Source) { return $cmd.Source }
        return $null
      }

      function PsQuote([string]$Value) {
        return "'" + $Value.Replace("'", "''") + "'"
      }

      $scriptsDir = Join-Path $RemoteBase 'Scripts'
      $secretsDir = Join-Path $RemoteBase 'Secrets'
      $logsDir = Join-Path $RemoteBase 'Logs'
      $clamDbDir = Join-Path $RemoteBase 'ClamAV\db'
      $workerFile = Join-Path $scriptsDir 'scan-supabase-documents-clamav.cjs'
      $runnerFile = Join-Path $scriptsDir 'run-document-clamav-scan.ps1'
      $envFile = Join-Path $secretsDir 'taxiassur-document-scan.env'
      $taskName = 'TaxiAssurDocumentClamAVScan'

      if (-not (Test-Path -LiteralPath $workerFile)) { throw "Worker missing: $workerFile" }

      $nodeCandidates = @(
        (Join-Path $env:ProgramFiles 'nodejs\node.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'nodejs\node.exe')
      )
      $nodePath = Find-Executable -Candidates $nodeCandidates -CommandName 'node.exe'
      if (-not $nodePath) { $nodePath = 'node.exe' }

      $clamCandidates = @(
        $ClamScanPath,
        (Join-Path $env:ProgramFiles 'ClamAV\clamscan.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'ClamAV\clamscan.exe'),
        (Join-Path $RemoteBase 'ClamAV\clamscan.exe')
      )
      $resolvedClamScan = Find-Executable -Candidates $clamCandidates -CommandName 'clamscan.exe'

      $documentEnv = Read-EnvFile $envFile
      $candidateEnvFiles = @(
        (Join-Path $secretsDir 'supabase-sync.env'),
        (Join-Path $secretsDir 'taxiassur-sync.env'),
        (Join-Path $secretsDir 'supabase-rest-sync.env'),
        (Join-Path $secretsDir 'supabase.env'),
        (Join-Path $secretsDir 'taxiassur-supabase.env')
      )
      $sourceEnvs = @()
      foreach ($candidateEnvFile in $candidateEnvFiles) {
        if (Test-Path -LiteralPath $candidateEnvFile) {
          $sourceEnvs += ,(Read-EnvFile $candidateEnvFile)
        }
      }

      Merge-Value -Target $documentEnv -Key 'SUPABASE_URL' -Sources $sourceEnvs
      Merge-Value -Target $documentEnv -Key 'SUPABASE_SERVICE_ROLE_KEY' -Sources $sourceEnvs
      Merge-Value -Target $documentEnv -Key 'SUPABASE_SERVER_KEY' -Sources $sourceEnvs
      Merge-Value -Target $documentEnv -Key 'SUPABASE_SECRET_KEY' -Sources $sourceEnvs

      if ($resolvedClamScan) { $documentEnv.CLAMSCAN_PATH = $resolvedClamScan }
      if (-not $documentEnv.ContainsKey('SUPABASE_URL')) { $documentEnv.SUPABASE_URL = '' }
      if (
        -not $documentEnv.ContainsKey('SUPABASE_SERVICE_ROLE_KEY') -and
        -not $documentEnv.ContainsKey('SUPABASE_SERVER_KEY') -and
        -not $documentEnv.ContainsKey('SUPABASE_SECRET_KEY')
      ) {
        $documentEnv.SUPABASE_SERVICE_ROLE_KEY = ''
      }
      if (-not $documentEnv.ContainsKey('CLAMSCAN_PATH')) { $documentEnv.CLAMSCAN_PATH = '' }
      if (-not $documentEnv.ContainsKey('CLAMSCAN_DATABASE_PATH')) { $documentEnv.CLAMSCAN_DATABASE_PATH = $clamDbDir }
      $documentEnv.SCAN_LIMIT = [string]$ScanLimit

      @(
        '# TaxiAssur document antivirus scan',
        '# Fill the Supabase server key locally on the server if it is blank.',
        "SUPABASE_URL=$($documentEnv.SUPABASE_URL)",
        "SUPABASE_SERVICE_ROLE_KEY=$($documentEnv.SUPABASE_SERVICE_ROLE_KEY)",
        "SUPABASE_SERVER_KEY=$($documentEnv.SUPABASE_SERVER_KEY)",
        "SUPABASE_SECRET_KEY=$($documentEnv.SUPABASE_SECRET_KEY)",
        "CLAMSCAN_PATH=$($documentEnv.CLAMSCAN_PATH)",
        "CLAMSCAN_DATABASE_PATH=$($documentEnv.CLAMSCAN_DATABASE_PATH)",
        "SCAN_LIMIT=$($documentEnv.SCAN_LIMIT)"
      ) | Set-Content -LiteralPath $envFile -Encoding UTF8

      try { icacls.exe $envFile /inheritance:r /grant:r 'SYSTEM:F' 'Administrateurs:F' | Out-Null } catch { }

      $runnerLines = @(
        '$ErrorActionPreference = ''Stop''',
        '$envFile = ' + (PsQuote $envFile),
        '$workerFile = ' + (PsQuote $workerFile),
        '$nodePath = ' + (PsQuote $nodePath),
        '$logsDir = ' + (PsQuote $logsDir),
        'function Import-DotEnv([string]$Path) {',
        '  if (-not (Test-Path -LiteralPath $Path)) { throw "Missing env file: $Path" }',
        '  foreach ($raw in Get-Content -LiteralPath $Path) {',
        '    $line = $raw.Trim()',
        '    if (-not $line -or $line.StartsWith("#")) { continue }',
        '    $idx = $line.IndexOf("=")',
        '    if ($idx -le 0) { continue }',
        '    $key = $line.Substring(0, $idx).Trim()',
        '    $value = $line.Substring($idx + 1).Trim()',
        '    [Environment]::SetEnvironmentVariable($key, $value, "Process")',
        '  }',
        '}',
        'New-Item -ItemType Directory -Force -Path $logsDir | Out-Null',
        'Import-DotEnv -Path $envFile',
        '$stamp = Get-Date -Format "yyyyMMdd-HHmmss"',
        '$outLog = Join-Path $logsDir "taxiassur-document-clamav-scan-$stamp.out.log"',
        '$errLog = Join-Path $logsDir "taxiassur-document-clamav-scan-$stamp.err.log"',
        '& $nodePath $workerFile 1>> $outLog 2>> $errLog',
        '$exitCode = $LASTEXITCODE',
        'if ($exitCode -ne 0) { throw "Document scan failed with exit code $exitCode. See $errLog" }'
      )
      $runnerLines | Set-Content -LiteralPath $runnerFile -Encoding UTF8

      $hasSupabaseUrl = -not [string]::IsNullOrWhiteSpace($documentEnv.SUPABASE_URL)
      $hasSupabaseKey =
        -not [string]::IsNullOrWhiteSpace($documentEnv.SUPABASE_SERVICE_ROLE_KEY) -or
        -not [string]::IsNullOrWhiteSpace($documentEnv.SUPABASE_SERVER_KEY) -or
        -not [string]::IsNullOrWhiteSpace($documentEnv.SUPABASE_SECRET_KEY)
      $hasClamScan = -not [string]::IsNullOrWhiteSpace($resolvedClamScan)
      $clamDbPath = if (-not [string]::IsNullOrWhiteSpace($documentEnv.CLAMSCAN_DATABASE_PATH)) { $documentEnv.CLAMSCAN_DATABASE_PATH } else { $clamDbDir }
      $hasClamDb = [bool](Get-ChildItem -LiteralPath $clamDbPath -Include '*.cvd','*.cld' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1)
      $hasNode = $nodePath -ne 'node.exe' -or [bool](Get-Command node.exe -ErrorAction SilentlyContinue)
      $ready = $hasSupabaseUrl -and $hasSupabaseKey -and $hasClamScan -and $hasClamDb -and $hasNode

      Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
      $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerFile`""
      $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
      $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
      Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force | Out-Null

      if (-not $ready) {
        Disable-ScheduledTask -TaskName $taskName | Out-Null
      } elseif ($RunNow) {
        Start-ScheduledTask -TaskName $taskName
      }

      $missing = @()
      if (-not $hasNode) { $missing += 'node.exe' }
      if (-not $hasClamScan) { $missing += 'clamscan.exe' }
      if (-not $hasClamDb) { $missing += 'ClamAV signature database' }
      if (-not $hasSupabaseUrl) { $missing += 'SUPABASE_URL' }
      if (-not $hasSupabaseKey) { $missing += 'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVER_KEY' }

      [pscustomobject]@{
        computer = $env:COMPUTERNAME
        task = $taskName
        task_enabled = $ready
        run_started = ($ready -and $RunNow)
        interval_minutes = $IntervalMinutes
        worker_file = $workerFile
        runner_file = $runnerFile
        env_file = $envFile
        logs_dir = $logsDir
        node_found = $hasNode
        clamscan_found = $hasClamScan
        clamav_database_found = $hasClamDb
        clamav_database_path = $clamDbPath
        supabase_url_present = $hasSupabaseUrl
        supabase_server_key_present = $hasSupabaseKey
        missing = $missing
      }
    }
    Add-Step 'Remote scheduled task' $true 'Document scan task configured'
  } finally {
    Remove-PSSession -Session $session
  }

  $report.ok = $true
  $report.result = $remoteResult
  $report.finished_at = (Get-Date).ToString('o')
  Save-Report $report
  Step "Installation terminee. Rapport : $ReportPath"
  Get-Content -LiteralPath $ReportPath -Raw
} catch {
  $report.ok = $false
  $report.error = $_.Exception.Message
  $report.finished_at = (Get-Date).ToString('o')
  Save-Report $report
  Write-Host "Installation echouee : $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Rapport ecrit : $ReportPath"
  exit 1
}
