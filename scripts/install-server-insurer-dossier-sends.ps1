param(
  [string]$Server = '192.168.1.70',
  [string]$DefaultUser = 'XCR\Administrateur',
  [switch]$UseStoredCredentials,
  [string]$RemoteBase = 'F:\TaxiAssur',
  [int]$IntervalMinutes = 10,
  [int]$SendLimit = 20,
  [switch]$RunNow,
  [string]$ReportPath = "$env:USERPROFILE\taxiassur-insurer-dossier-sends-install-192-168-1-70.json"
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
$localWorker = Join-Path $repoRoot 'scripts\process-insurer-dossier-sends.cjs'
if (-not (Test-Path -LiteralPath $localWorker)) { throw "Local worker not found: $localWorker" }

Write-Host 'Installation des envois dossiers assureurs TaxiAssur'
Write-Host "Serveur : $Server"
Write-Host "Tache : TaxiAssurInsurerDossierSends, toutes les $IntervalMinutes minutes"
Write-Host 'Aucune cle ne sera affichee. Les secrets restent dans F:\TaxiAssur\Secrets.'
Write-Host 'Rappel : cette tache ne cree pas les dossiers. Elle traite uniquement les demandes creees par validation backoffice.'
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

    Step 'Copie du worker dossiers assureurs'
    Copy-Item -LiteralPath $localWorker -Destination ($RemoteBase.TrimEnd('\') + '\Scripts\process-insurer-dossier-sends.cjs') -ToSession $session -Force
    Add-Step 'Worker copied' $true 'process-insurer-dossier-sends.cjs copied'

    Step 'Configuration distante de la tache planifiee'
    $remoteResult = Invoke-Command -Session $session -ArgumentList $RemoteBase,$IntervalMinutes,$SendLimit,$RunNow.IsPresent -ScriptBlock {
      param($RemoteBase,$IntervalMinutes,$SendLimit,$RunNow)
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
      $workerFile = Join-Path $scriptsDir 'process-insurer-dossier-sends.cjs'
      $runnerFile = Join-Path $scriptsDir 'run-insurer-dossier-sends.ps1'
      $envFile = Join-Path $secretsDir 'taxiassur-insurer-dossier-sends.env'
      $taskName = 'TaxiAssurInsurerDossierSends'

      if (-not (Test-Path -LiteralPath $workerFile)) { throw "Worker missing: $workerFile" }

      $nodeCandidates = @(
        (Join-Path $env:ProgramFiles 'nodejs\node.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'nodejs\node.exe')
      )
      $nodePath = Find-Executable -Candidates $nodeCandidates -CommandName 'node.exe'
      if (-not $nodePath) { $nodePath = 'node.exe' }

      $dossierEnv = Read-EnvFile $envFile
      $candidateEnvFiles = @(
        (Join-Path $secretsDir 'supabase-sync.env'),
        (Join-Path $secretsDir 'taxiassur-sync.env'),
        (Join-Path $secretsDir 'supabase-rest-sync.env'),
        (Join-Path $secretsDir 'supabase.env'),
        (Join-Path $secretsDir 'taxiassur-supabase.env'),
        (Join-Path $secretsDir 'taxiassur-document-scan.env'),
        (Join-Path $secretsDir 'taxiassur-client-access-outbox.env')
      )
      $sourceEnvs = @()
      foreach ($candidateEnvFile in $candidateEnvFiles) {
        if (Test-Path -LiteralPath $candidateEnvFile) {
          $sourceEnvs += ,(Read-EnvFile $candidateEnvFile)
        }
      }

      Merge-Value -Target $dossierEnv -Key 'SUPABASE_URL' -Sources $sourceEnvs
      Merge-Value -Target $dossierEnv -Key 'VITE_SUPABASE_URL' -Sources $sourceEnvs
      Merge-Value -Target $dossierEnv -Key 'SUPABASE_SERVICE_ROLE_KEY' -Sources $sourceEnvs
      Merge-Value -Target $dossierEnv -Key 'SUPABASE_SERVICE_KEY' -Sources $sourceEnvs
      Merge-Value -Target $dossierEnv -Key 'SERVICE_ROLE_KEY' -Sources $sourceEnvs
      Merge-Value -Target $dossierEnv -Key 'SUPABASE_SECRET_KEY' -Sources $sourceEnvs

      if (-not $dossierEnv.ContainsKey('SUPABASE_URL')) { $dossierEnv.SUPABASE_URL = '' }
      if (-not $dossierEnv.ContainsKey('VITE_SUPABASE_URL')) { $dossierEnv.VITE_SUPABASE_URL = '' }
      if (
        -not $dossierEnv.ContainsKey('SUPABASE_SERVICE_ROLE_KEY') -and
        -not $dossierEnv.ContainsKey('SUPABASE_SERVICE_KEY') -and
        -not $dossierEnv.ContainsKey('SERVICE_ROLE_KEY') -and
        -not $dossierEnv.ContainsKey('SUPABASE_SECRET_KEY')
      ) {
        $dossierEnv.SUPABASE_SERVICE_ROLE_KEY = ''
      }
      if (-not $dossierEnv.ContainsKey('SUPABASE_SERVICE_KEY')) { $dossierEnv.SUPABASE_SERVICE_KEY = '' }
      if (-not $dossierEnv.ContainsKey('SERVICE_ROLE_KEY')) { $dossierEnv.SERVICE_ROLE_KEY = '' }
      if (-not $dossierEnv.ContainsKey('SUPABASE_SECRET_KEY')) { $dossierEnv.SUPABASE_SECRET_KEY = '' }
      if (-not $dossierEnv.ContainsKey('INSURER_DOSSIER_DRY_RUN')) { $dossierEnv.INSURER_DOSSIER_DRY_RUN = '0' }
      $dossierEnv.INSURER_DOSSIER_SEND_LIMIT = [string]$SendLimit

      @(
        '# TaxiAssur insurer dossier sends',
        '# Fill the Supabase server key locally on the server if it is blank.',
        '# The worker processes only dossiers already queued by a backoffice human validation.',
        "SUPABASE_URL=$($dossierEnv.SUPABASE_URL)",
        "VITE_SUPABASE_URL=$($dossierEnv.VITE_SUPABASE_URL)",
        "SUPABASE_SERVICE_ROLE_KEY=$($dossierEnv.SUPABASE_SERVICE_ROLE_KEY)",
        "SUPABASE_SERVICE_KEY=$($dossierEnv.SUPABASE_SERVICE_KEY)",
        "SERVICE_ROLE_KEY=$($dossierEnv.SERVICE_ROLE_KEY)",
        "SUPABASE_SECRET_KEY=$($dossierEnv.SUPABASE_SECRET_KEY)",
        "INSURER_DOSSIER_SEND_LIMIT=$($dossierEnv.INSURER_DOSSIER_SEND_LIMIT)",
        "INSURER_DOSSIER_DRY_RUN=$($dossierEnv.INSURER_DOSSIER_DRY_RUN)"
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
        '$outLog = Join-Path $logsDir "taxiassur-insurer-dossier-sends-$stamp.out.log"',
        '$errLog = Join-Path $logsDir "taxiassur-insurer-dossier-sends-$stamp.err.log"',
        'Get-ChildItem -LiteralPath $logsDir -Filter "taxiassur-insurer-dossier-sends-*.log" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force',
        '& $nodePath $workerFile 1>> $outLog 2>> $errLog',
        '$exitCode = $LASTEXITCODE',
        'if ($exitCode -ne 0) { throw "Insurer dossier sends failed with exit code $exitCode. See $errLog" }'
      )
      $runnerLines | Set-Content -LiteralPath $runnerFile -Encoding UTF8

      $hasSupabaseUrl =
        -not [string]::IsNullOrWhiteSpace($dossierEnv.SUPABASE_URL) -or
        -not [string]::IsNullOrWhiteSpace($dossierEnv.VITE_SUPABASE_URL)
      $hasSupabaseKey =
        -not [string]::IsNullOrWhiteSpace($dossierEnv.SUPABASE_SERVICE_ROLE_KEY) -or
        -not [string]::IsNullOrWhiteSpace($dossierEnv.SUPABASE_SERVICE_KEY) -or
        -not [string]::IsNullOrWhiteSpace($dossierEnv.SERVICE_ROLE_KEY) -or
        -not [string]::IsNullOrWhiteSpace($dossierEnv.SUPABASE_SECRET_KEY)
      $hasNode = $nodePath -ne 'node.exe' -or [bool](Get-Command node.exe -ErrorAction SilentlyContinue)
      $ready = $hasSupabaseUrl -and $hasSupabaseKey -and $hasNode

      Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
      $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerFile`""
      $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
      $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20)
      Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest -Force | Out-Null

      if (-not $ready) {
        Disable-ScheduledTask -TaskName $taskName | Out-Null
      } elseif ($RunNow) {
        Start-ScheduledTask -TaskName $taskName
      }

      $missing = @()
      if (-not $hasNode) { $missing += 'node.exe' }
      if (-not $hasSupabaseUrl) { $missing += 'SUPABASE_URL or VITE_SUPABASE_URL' }
      if (-not $hasSupabaseKey) { $missing += 'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY' }

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
        send_limit = $SendLimit
        human_validation_required = $true
        missing = $missing
      }
    }
    Add-Step 'Remote scheduled task' $true 'Insurer dossier sends task configured'
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
