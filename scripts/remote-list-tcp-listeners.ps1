$listeners = Get-NetTCPConnection -State Listen | ForEach-Object {
  $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
  [pscustomobject]@{ address = $_.LocalAddress; port = $_.LocalPort; process_id = $_.OwningProcess; process = $process.ProcessName }
}
$listeners | Sort-Object port, address | ConvertTo-Json -Depth 3 | Set-Content 'C:\Windows\Temp\tcp-listeners.json' -Encoding UTF8
