param(
  [string]$Server = '192.168.1.70',
  [string]$DefaultUser = 'XCR\Administrateur',
  [switch]$UseStoredCredentials,
  [string]$RemoteBase = 'F:\TaxiAssur',
  [int]$IntervalMinutes = 5,
  [int]$OutboxLimit = 25,
  [int]$MaxAttempts = 5,
  [switch]$RunNow,
  [string]$ReportPath = "$env:USERPROFILE\taxiassur-client-access-outbox-install-192-168-1-70.json"
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
$localWorker = Join-Path $repoRoot 'scripts\process-client-portal-access-outbox.cjs'
if (-not (Test-Path -LiteralPath $localWorker)) { throw "Local worker not found: $localWorker" }

Write-Host 'Installation de la file acces portail client TaxiAssur'
Write-Host "Serveur : $Server"
Write-Host "Tache : TaxiAssurClientAccessOutbox, toutes les $IntervalMinutes minutes"
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
        (Join-Path $RemoteBase 'Logs')
      )) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
      }
    }
    Add-Step 'Remote directories' $true 'Scripts/Secrets/Logs ready'

    Step 'Copie du worker client access outbox'
    Copy-Item -LiteralPath $localWorker -Destination ($RemoteBase.TrimEnd('\') + '\Scripts\process-client-portal-access-outbox.cjs') -ToSession $session -Force
    Add-Step 'Worker copied' $true 'process-client-portal-access-outbox.cjs copied'

    Step 'Configuration distante de la tache planifiee'
    $remoteResult = Invoke-Command -Session $session -ArgumentList $RemoteBase,$IntervalMinutes,$OutboxLimit,$MaxAttempts,[bool]$RunNow -ScriptBlock {
      param($RemoteBase,$IntervalMinutes,$OutboxLimit,$MaxAttempts,$RunNow)
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
      $workerFile = Join-Path $scriptsDir 'process-client-portal-access-outbox.cjs'
      $runnerFile = Join-Path $scriptsDir 'run-client-access-outbox.ps1'
      $envFile = Join-Path $secretsDir 'taxiassur-client-access-outbox.env'
      $taskName = 'TaxiAssurClientAccessOutbox'

      if (-not (Test-Path -LiteralPath $workerFile)) { throw "Worker missing: $workerFile" }

      $nodeCandidates = @(
        (Join-Path $env:ProgramFiles 'nodejs\node.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'nodejs\node.exe')
      )
      $nodePath = Find-Executable -Candidates $nodeCandidates -CommandName 'node.exe'
      if (-not $nodePath) { $nodePath = 'node.exe' }

      $outboxEnv = Read-EnvFile $envFile
      $candidateEnvFiles = @(
        (Join-Path $secretsDir 'supabase-sync.env'),
        (Join-Path $secretsDir 'taxiassur-sync.env'),
        (Join-Path $secretsDir 'supabase-rest-sync.env'),
        (Join-Path $secretsDir 'supabase.env'),
        (Join-Path $secretsDir 'taxiassur-supabase.env'),
        (Join-Path $secretsDir 'taxiassur-document-scan.env')
      )
      $sourceEnvs = @()
      foreach ($candidateEnvFile in $candidateEnvFiles) {
        if (Test-Path -LiteralPath $candidateEnvFile) {
          $sourceEnvs += ,(Read-EnvFile $candidateEnvFile)
        }
      }

      Merge-Value -Target $outboxEnv -Key 'SUPABASE_URL' -Sources $sourceEnvs
      Merge-Value -Target $outboxEnv -Key 'VITE_SUPABASE_URL' -Sources $sourceEnvs
      Merge-Value -Target $outboxEnv -Key 'SUPABASE_SERVICE_ROLE_KEY' -Sources $sourceEnvs
      Merge-Value -Target $outboxEnv -Key 'SUPABASE_SERVER_KEY' -Sources $sourceEnvs
      Merge-Value -Target $outboxEnv -Key 'SUPABASE_SECRET_KEY' -Sources $sourceEnvs

      if (-not $outboxEnv.ContainsKey('SUPABASE_URL')) { $outboxEnv.SUPABASE_URL = '' }
      if (-not $outboxEnv.ContainsKey('VITE_SUPABASE_URL')) { $outboxEnv.VITE_SUPABASE_URL = '' }
      if (
        -not $outboxEnv.ContainsKey('SUPABASE_SERVICE_ROLE_KEY') -and
        -not $outboxEnv.ContainsKey('SUPABASE_SERVER_KEY') -and
        -not $outboxEnv.ContainsKey('SUPABASE_SECRET_KEY')
      ) {
        $outboxEnv.SUPABASE_SERVICE_ROLE_KEY = ''
      }
      if (-not $outboxEnv.ContainsKey('SUPABASE_SERVER_KEY')) { $outboxEnv.SUPABASE_SERVER_KEY = '' }
      if (-not $outboxEnv.ContainsKey('SUPABASE_SECRET_KEY')) { $outboxEnv.SUPABASE_SECRET_KEY = '' }
      $outboxEnv.CLIENT_ACCESS_OUTBOX_LIMIT = [string]$OutboxLimit
      $outboxEnv.CLIENT_ACCESS_OUTBOX_MAX_ATTEMPTS = [string]$MaxAttempts

      @(
        '# TaxiAssur client portal access outbox',
        '# Fill the Supabase server key locally on the server if it is blank.',
        "SUPABASE_URL=$($outboxEnv.SUPABASE_URL)",
        "VITE_SUPABASE_URL=$($outboxEnv.VITE_SUPABASE_URL)",
        "SUPABASE_SERVICE_ROLE_KEY=$($outboxEnv.SUPABASE_SERVICE_ROLE_KEY)",
        "SUPABASE_SERVER_KEY=$($outboxEnv.SUPABASE_SERVER_KEY)",
        "SUPABASE_SECRET_KEY=$($outboxEnv.SUPABASE_SECRET_KEY)",
        "CLIENT_ACCESS_OUTBOX_LIMIT=$($outboxEnv.CLIENT_ACCESS_OUTBOX_LIMIT)",
        "CLIENT_ACCESS_OUTBOX_MAX_ATTEMPTS=$($outboxEnv.CLIENT_ACCESS_OUTBOX_MAX_ATTEMPTS)"
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
        '$outLog = Join-Path $logsDir "taxiassur-client-access-outbox-$stamp.out.log"',
        '$errLog = Join-Path $logsDir "taxiassur-client-access-outbox-$stamp.err.log"',
        'Get-ChildItem -LiteralPath $logsDir -Filter "taxiassur-client-access-outbox-*.log" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force',
        '& $nodePath $workerFile 1>> $outLog 2>> $errLog',
        '$exitCode = $LASTEXITCODE',
        'if ($exitCode -ne 0) { throw "Client access outbox failed with exit code $exitCode. See $errLog" }'
      )
      $runnerLines | Set-Content -LiteralPath $runnerFile -Encoding UTF8

      $hasSupabaseUrl =
        -not [string]::IsNullOrWhiteSpace($outboxEnv.SUPABASE_URL) -or
        -not [string]::IsNullOrWhiteSpace($outboxEnv.VITE_SUPABASE_URL)
      $hasSupabaseKey =
        -not [string]::IsNullOrWhiteSpace($outboxEnv.SUPABASE_SERVICE_ROLE_KEY) -or
        -not [string]::IsNullOrWhiteSpace($outboxEnv.SUPABASE_SERVER_KEY) -or
        -not [string]::IsNullOrWhiteSpace($outboxEnv.SUPABASE_SECRET_KEY)
      $hasNode = $nodePath -ne 'node.exe' -or [bool](Get-Command node.exe -ErrorAction SilentlyContinue)
      $ready = $hasSupabaseUrl -and $hasSupabaseKey -and $hasNode

      Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
      $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerFile`""
      $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
      $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
      Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force | Out-Null

      if (-not $ready) {
        Disable-ScheduledTask -TaskName $taskName | Out-Null
      } elseif ($RunNow) {
        Start-ScheduledTask -TaskName $taskName
      }

      $missing = @()
      if (-not $hasNode) { $missing += 'node.exe' }
      if (-not $hasSupabaseUrl) { $missing += 'SUPABASE_URL or VITE_SUPABASE_URL' }
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
        supabase_url_present = $hasSupabaseUrl
        supabase_server_key_present = $hasSupabaseKey
        outbox_limit = $OutboxLimit
        max_attempts = $MaxAttempts
        missing = $missing
      }
    }
    Add-Step 'Remote scheduled task' $true 'Client access outbox task configured'
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
