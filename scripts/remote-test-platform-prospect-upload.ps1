param([string]$ReportPath = 'C:\Windows\Temp\taxiassur-platform-prospect-test.json')
$ErrorActionPreference = 'Stop'
$result = [ordered]@{ ok = $false; session = $false; upload = $false; download = $false; cleanup = $false; error = $null }
$psql = 'F:\TaxiAssur\PostgreSQL\runtime\pgsql\bin\psql.exe'
$dbEnv = Get-Content 'F:\TaxiAssur\Secrets\postgresql.env' | Where-Object { $_ -match '=' } | ForEach-Object { $parts = $_ -split '=', 2; @{ key = $parts[0].Trim(); value = $parts[1].Trim().Trim('"').Trim("'") } }
function EnvValue([string]$Name) { return ($dbEnv | Where-Object { $_.key -eq $Name } | Select-Object -First 1).value }
$env:PGPASSWORD = EnvValue 'TAXIASSUR_APP_PASSWORD'
try {
  $token = (& $psql -X -q -A -t -h 127.0.0.1 -p 5432 -U taxiassur_app -d taxiassur -c "SELECT data->>'access_token' FROM taxiassur.records WHERE collection='crm_leads' AND data->>'access_token' ~ '^[0-9a-fA-F]{64}$' LIMIT 1;").Trim()
  if ($token.Length -ne 64) { throw 'No compatible prospect token found' }
  $headers = @{ 'X-Prospect-Token' = $token }
  $session = Invoke-RestMethod -Uri 'http://127.0.0.1:8796/v1/prospect/session' -Headers $headers -Method Get -TimeoutSec 20
  if (-not $session.ok -or -not $session.lead.id) { throw 'Prospect session failed' }
  $result.session = $true
  $testFile = 'C:\Windows\Temp\taxiassur-upload-test.pdf'
  [IO.File]::WriteAllBytes($testFile, [Text.Encoding]::ASCII.GetBytes("%PDF-1.4`n1 0 obj<</Type/Catalog>>endobj`n%%EOF`n"))
  $uploadHeaders = @{ 'X-Prospect-Token' = $token; 'X-Document-Type' = 'autre'; 'X-File-Name' = [Uri]::EscapeDataString('test-migration.pdf') }
  $uploaded = Invoke-RestMethod -Uri 'http://127.0.0.1:8796/v1/prospect/documents' -Headers $uploadHeaders -Method Post -ContentType 'application/pdf' -InFile $testFile -TimeoutSec 90
  if (-not $uploaded.ok -or -not $uploaded.document.id) { throw 'Prospect upload failed' }
  $result.upload = $true
  $downloadFile = 'C:\Windows\Temp\taxiassur-upload-test-download.pdf'
  Invoke-WebRequest -UseBasicParsing -Uri ("http://127.0.0.1:8796/v1/prospect/documents/{0}/download" -f $uploaded.document.id) -Headers $headers -OutFile $downloadFile -TimeoutSec 30
  if ((Get-FileHash $testFile -Algorithm SHA256).Hash -ne (Get-FileHash $downloadFile -Algorithm SHA256).Hash) { throw 'Downloaded file differs' }
  $result.download = $true
  $storagePath = (& $psql -X -q -A -t -h 127.0.0.1 -p 5432 -U taxiassur_app -d taxiassur -c ("SELECT storage_path FROM taxiassur.file_objects WHERE id='{0}'::uuid;" -f $uploaded.document.id)).Trim()
  & $psql -X -q -h 127.0.0.1 -p 5432 -U taxiassur_app -d taxiassur -v ON_ERROR_STOP=1 -c ("BEGIN; DELETE FROM taxiassur.records WHERE collection='prospect_documents' AND record_id='{0}'; DELETE FROM taxiassur.file_objects WHERE id='{0}'::uuid; COMMIT;" -f $uploaded.document.id) | Out-Null
  if ($storagePath) { Remove-Item -LiteralPath (Join-Path 'F:\TaxiAssur\Documents' $storagePath) -Force -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath $testFile,$downloadFile -Force -ErrorAction SilentlyContinue
  $result.cleanup = $true
  $result.ok = $true
} catch { $result.error = $_.Exception.Message }
$result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
