$ErrorActionPreference = 'Continue'
$clamd = 'C:\Program Files\ClamAV\clamd.exe'
$config = 'F:\TaxiAssur\ClamAV\clamd.conf'
$log = 'F:\TaxiAssur\Logs\clamd-supervisor.log'

while ($true) {
  & $clamd "--config-file=$config" 1>> $log 2>&1
  Add-Content -LiteralPath $log -Value "[$(Get-Date -Format o)] clamd stopped; restarting in 5 seconds"
  Start-Sleep -Seconds 5
}
