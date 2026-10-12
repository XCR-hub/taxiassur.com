param([string]$Server='192.168.1.70')
$ErrorActionPreference='Stop'
$secret=Read-Host 'Mot de passe Windows (saisie masquee)' -AsSecureString
$credential=[PSCredential]::new('XCR\Administrateur',$secret)
$drive=$null
try {
  $drive=New-PSDrive -Name TaxiAV -PSProvider FileSystem -Root "\\$Server\f$\TaxiAssur" -Credential $credential
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'diagnose-native-antivirus-remote.ps1') -Destination 'TaxiAV:\Scripts\diagnose-native-antivirus-remote.ps1' -Force
  $name='antivirus-diagnostic-'+[guid]::NewGuid().ToString('N')+'.json'
  $command='powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "F:\TaxiAssur\Scripts\diagnose-native-antivirus-remote.ps1" -ReportPath "F:\TaxiAssur\Logs\'+$name+'"'
  $launch=Invoke-WmiMethod -ComputerName $Server -Credential $credential -Class Win32_Process -Name Create -ArgumentList $command
  if($launch.ReturnValue -ne 0){throw 'Diagnostic launch failed'}
  for($attempt=0;$attempt -lt 50;$attempt++){
    if(Test-Path -LiteralPath ('TaxiAV:\Logs\'+$name)){Get-Content -LiteralPath ('TaxiAV:\Logs\'+$name);break}
    Start-Sleep -Seconds 3
  }
} finally {if($drive){Remove-PSDrive TaxiAV -Force}}
