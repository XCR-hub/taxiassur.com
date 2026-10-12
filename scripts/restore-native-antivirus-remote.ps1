param([string]$ReportPath)
$ErrorActionPreference='Stop'
$result=[ordered]@{ok=$false;error=$null;task=$null;resident_scan=$null}
try {
  $tasks=@(Get-ScheduledTask | Where-Object {($_.Actions | ForEach-Object { $_.Execute+' '+$_.Arguments }) -match 'start-taxiassur-clamd|clamd\.exe'})
  if($tasks.Count -gt 1){throw 'Multiple resident antivirus tasks; review required'}
  if($tasks.Count -eq 0){
    $action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "F:\TaxiAssur\Scripts\start-taxiassur-clamd.ps1"'
    $trigger=New-ScheduledTaskTrigger -AtStartup
    $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
    $task=Register-ScheduledTask -TaskName 'TaxiAssur ClamAV Resident' -Action $action -Trigger $trigger -Settings $settings -User SYSTEM -RunLevel Highest
  }else{$task=$tasks[0]}
  $result.task=$task.TaskName
  if($task.State -ne 'Running'){Start-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath}
  $file='F:\TaxiAssur\ClamAV\resident-diagnostic-'+[guid]::NewGuid().ToString('N')+'.txt'
  Set-Content -LiteralPath $file -Value 'Harmless resident antivirus diagnostic' -Encoding ASCII
  try {
    for($attempt=0;$attempt -lt 30;$attempt++){
      $ErrorActionPreference='Continue'
      $output=& 'C:\Program Files\ClamAV\clamdscan.exe' '--config-file=F:\TaxiAssur\ClamAV\clamd.conf' '--no-summary' $file 2>&1 | Out-String
      $scanExit=$LASTEXITCODE
      $ErrorActionPreference='Stop'
      if($scanExit -eq 0){$result.resident_scan='clean';$result.ok=$true;break}
      Start-Sleep -Seconds 3
    }
  }finally{Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue}
  if(-not $result.ok){throw 'Resident antivirus did not become ready'}
}catch{$result.error=$_.Exception.Message}
$result | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
