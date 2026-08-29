$ErrorActionPreference = 'Continue'
$node = 'C:\Program Files\nodejs\node.exe'
$api = 'F:\TaxiAssur\Api\taxiassur-platform-api.mjs'
$out = 'F:\TaxiAssur\Logs\taxiassur-platform-api.out.log'
$err = 'F:\TaxiAssur\Logs\taxiassur-platform-api.err.log'

while ($true) {
  & $node $api 1>> $out 2>> $err
  $exitCode = $LASTEXITCODE
  Add-Content -LiteralPath $err -Value "[$(Get-Date -Format o)] platform API exited with code $exitCode; restarting in 2 seconds"
  Start-Sleep -Seconds 2
}
