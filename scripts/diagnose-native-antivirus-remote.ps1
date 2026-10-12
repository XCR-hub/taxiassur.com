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
$result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
