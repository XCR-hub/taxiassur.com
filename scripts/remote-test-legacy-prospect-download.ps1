param([string]$ReportPath = 'C:\Windows\Temp\taxiassur-legacy-download-test.json')
$ErrorActionPreference = 'Stop'
$result = [ordered]@{ ok = $false; candidate = $false; downloaded = $false; hashes_match = $false; error = $null }
function Read-Env([string]$Path) { $values=@{}; Get-Content $Path | ForEach-Object { if ($_ -match '^\s*([^#][^=]+)=(.*)$') { $values[$matches[1].Trim()]=$matches[2].Trim().Trim('"').Trim("'") } }; $values }
try {
  $config = Read-Env 'F:\TaxiAssur\Secrets\postgresql.env'; $env:PGPASSWORD=$config.POSTGRES_PASSWORD; $env:PGCLIENTENCODING='UTF8'
  $psql='F:\TaxiAssur\PostgreSQL\runtime\pgsql\bin\psql.exe'
  $sql=@"
SELECT jsonb_build_object('token', l.data->>'access_token', 'document_id', d.record_id, 'file_path', d.data->>'file_path')::text
FROM taxiassur.records d JOIN taxiassur.records l ON l.collection='crm_leads' AND l.record_id=d.data->>'lead_id'
WHERE d.collection='prospect_documents' AND d.record_id ~ '^[0-9a-fA-F-]{36}$' AND l.data->>'access_token' ~ '^[0-9a-fA-F]{64}$'
ORDER BY d.updated_at DESC;
"@
  $rows=& $psql -X -q -A -t -h 127.0.0.1 -p 5432 -U postgres -d taxiassur -c $sql
  $candidate=$null
  foreach ($line in $rows) { if (-not $line.Trim()) { continue }; $item=$line | ConvertFrom-Json; $local=Join-Path 'F:\TaxiAssur\Documents\legacy\prospect-documents' $item.file_path; if (Test-Path -LiteralPath $local) { $candidate=[ordered]@{ item=$item; local=$local }; break } }
  if (-not $candidate) { throw 'No downloadable legacy prospect document found' }
  $result.candidate=$true
  $download='C:\Windows\Temp\taxiassur-legacy-download.bin'
  Invoke-WebRequest -UseBasicParsing -Uri ("http://127.0.0.1:8796/v1/prospect/documents/{0}/download" -f $candidate.item.document_id) -Headers @{ 'X-Prospect-Token'=$candidate.item.token } -OutFile $download -TimeoutSec 30
  $result.downloaded=$true
  $result.hashes_match=(Get-FileHash -LiteralPath $candidate.local -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash
  if (-not $result.hashes_match) { throw 'Hash mismatch' }
  Remove-Item -LiteralPath $download -Force
  $result.ok=$true
} catch { $result.error=$_.Exception.Message }
$result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
