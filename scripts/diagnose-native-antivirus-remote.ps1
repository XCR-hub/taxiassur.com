param([string]$ReportPath)
$ErrorActionPreference='Continue'
$result=[ordered]@{checked_at=(Get-Date).ToString('o');clamd_processes=@(Get-Process clamd -ErrorAction SilentlyContinue | Select-Object Id,StartTime);config_exists=(Test-Path 'F:\TaxiAssur\ClamAV\clamd.conf');databases=@(Get-ChildItem 'F:\TaxiAssur\ClamAV\db' -File | Select-Object Name,Length,LastWriteTime);scans=@()}
$file='F:\TaxiAssur\ClamAV\native-diagnostic.txt'
Set-Content -LiteralPath $file -Value 'TaxiAssur harmless antivirus diagnostic' -Encoding ASCII
try {
  foreach($mode in @('clamdscan','clamscan')) {
    $exe='C:\Program Files\ClamAV\'+$mode+'.exe'
    $arguments=if($mode -eq 'clamdscan'){@('--config-file=F:\TaxiAssur\ClamAV\clamd.conf','--no-summary',$file)}else{@('--database=F:\TaxiAssur\ClamAV\db','--no-summary',$file)}
    $output=& $exe @arguments 2>&1 | Out-String
    $result.scans+=@{mode=$mode;exit_code=$LASTEXITCODE;output=$output}
  }
} finally { Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue }
$result.tasks=@(Get-ScheduledTask | Where-Object {$_.TaskName -match 'clam|antivirus'} | ForEach-Object {@{name=[string]$_.TaskName;state=[string]$_.State}})
$result.clamd_log=@(Get-Content 'F:\TaxiAssur\Logs\clamd-supervisor.log' -Tail 6 -ErrorAction SilentlyContinue | ForEach-Object { $_.Substring(0,[Math]::Min($_.Length,300)) })
$downloadReport=$ReportPath+'.downloads.json'
& 'C:\Program Files\nodejs\node.exe' 'F:\TaxiAssur\Scripts\verify-native-download-remote.mjs' $downloadReport
if(Test-Path -LiteralPath $downloadReport){$result.downloads=Get-Content -LiteralPath $downloadReport -Raw | ConvertFrom-Json}
$result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
