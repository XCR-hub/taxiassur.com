$ErrorActionPreference = "Stop"
$pgDump = "F:\TaxiAssur\PostgreSQL\runtime\pgsql\bin\pg_dump.exe"
$secretFile = "F:\TaxiAssur\Secrets\postgresql.env"
$backupDir = "F:\TaxiAssur\Backups\PostgreSQL"
function Read-EnvFile([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Fichier introuvable : $path" }
  $env = @{}
  foreach ($line in Get-Content -LiteralPath $path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
    $index = $trimmed.IndexOf('=')
    if ($index -lt 1) { continue }
    $key = $trimmed.Substring(0, $index).Trim()
    $value = $trimmed.Substring($index + 1).Trim()
    if ($value.Length -ge 2) {
      $first = $value[0]
      $last = $value[$value.Length - 1]
      if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }
    $env[$key] = $value
  }
  return $env
}
$secret = Read-EnvFile $secretFile
$env:PGPASSWORD = $secret.POSTGRES_PASSWORD
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $backupDir "taxiassur_$stamp.dump"
& $pgDump -h 127.0.0.1 -p 5432 -U postgres -d taxiassur -F c -f $target
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
Get-ChildItem -LiteralPath $backupDir -Filter "taxiassur_*.dump" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force

