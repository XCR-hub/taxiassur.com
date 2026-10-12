param([string]$Server='192.168.1.70',[string]$UserName='XCR\Administrateur')
$ErrorActionPreference='Stop'
$password=Read-Host 'Mot de passe Windows (saisie masquee)' -AsSecureString
$credential=[PSCredential]::new($UserName,$password)
$drive=$null
try {
  $drive=New-PSDrive -Name TaxiAssurDiag -PSProvider FileSystem -Root "\\$Server\f$\TaxiAssur" -Credential $credential
  $files=Get-ChildItem -LiteralPath 'TaxiAssurDiag:\Logs' -File | Sort-Object LastWriteTime -Descending
  $files | Select-Object -First 12 Name,LastWriteTime | Format-Table -AutoSize
  foreach($file in ($files | Where-Object {$_.Name -match '^antivirus-diagnostic-.*\.json$|^clamd.*\.log$'} | Select-Object -First 4)) {
    Write-Host ('Diagnostic : '+$file.Name)
    if($file.Extension -eq '.json') {
      $diagnostic=Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
      $diagnostic | Select-Object checked_at,tasks,downloads | ConvertTo-Json -Depth 5
    } else {
      Get-Content -LiteralPath $file.FullName -Tail 6 | ForEach-Object { $_.Substring(0,[Math]::Min($_.Length,300)) }
    }
  }
  foreach($file in ($files | Where-Object { $_.Name -match 'platform.*(error|stderr)|api.*(error|stderr)|clamav-scan.*(err|out)\.log' } | Select-Object -First 4)) {
    Write-Host ('Journal : '+$file.Name)
    Get-Content -LiteralPath $file.FullName -Tail 60 | ForEach-Object { $_ -replace 'Bearer\s+\S+','Bearer [redacted]' -replace 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[token redacted]' }
  }
} finally { if($drive){Remove-PSDrive -Name TaxiAssurDiag -Force} }
