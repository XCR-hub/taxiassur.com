param([string]$Server='192.168.1.70')
$ErrorActionPreference='Stop'
$secret=Read-Host 'Mot de passe Windows (saisie masquee)' -AsSecureString
$credential=[PSCredential]::new('XCR\Administrateur',$secret)
$drive=$null
try{
  $drive=New-PSDrive -Name TaxiAVRestore -PSProvider FileSystem -Root "\\$Server\f$\TaxiAssur" -Credential $credential
  foreach($name in @('restore-native-antivirus-remote.ps1','start-taxiassur-clamd.ps1')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination ('TaxiAVRestore:\Scripts\'+$name) -Force}
  $name='native-antivirus-restore-'+[guid]::NewGuid().ToString('N')+'.json'
  $command='powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "F:\TaxiAssur\Scripts\restore-native-antivirus-remote.ps1" -ReportPath "F:\TaxiAssur\Logs\'+$name+'"'
  $launch=Invoke-WmiMethod -ComputerName $Server -Credential $credential -Class Win32_Process -Name Create -ArgumentList $command
  if($launch.ReturnValue -ne 0){throw 'Antivirus restore launch failed'}
  $report=$null
  for($attempt=0;$attempt -lt 60;$attempt++){
    if(Test-Path -LiteralPath ('TaxiAVRestore:\Logs\'+$name)){$report=Get-Content -LiteralPath ('TaxiAVRestore:\Logs\'+$name) -Raw | ConvertFrom-Json;break}
    Start-Sleep -Seconds 3
  }
  if(-not $report){throw 'Antivirus restore report not available'}
  $report | ConvertTo-Json -Depth 3
  if(-not $report.ok){throw $report.error}
}finally{if($drive){Remove-PSDrive TaxiAVRestore -Force}}
