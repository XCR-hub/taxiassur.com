param([string]$Email = 'tcerda@xcr.fr', [switch]$ListMasters, [string]$ReportPath = 'C:\Windows\Temp\native-admin-check.json')
$ErrorActionPreference='Stop'
function Read-Env($Path) { $values=@{}; Get-Content $Path | ForEach-Object { if ($_ -match '^\s*([^#][^=]+)=(.*)$') { $values[$matches[1].Trim()]=$matches[2].Trim().Trim('"').Trim("'") } }; $values }
$config=Read-Env 'F:\TaxiAssur\Secrets\postgresql.env'; $env:PGPASSWORD=$config.POSTGRES_PASSWORD
$safeEmail=$Email.ToLowerInvariant().Replace("'","''")
$sql=if ($ListMasters) { "SELECT coalesce(json_agg(json_build_object('email',email,'active',is_active,'password_initialized',password_hash IS NOT NULL) ORDER BY email),'[]'::json) FROM taxiassur.auth_users WHERE role='master';" } else { "SELECT json_build_object('exists',count(*)>0,'active',coalesce(bool_or(is_active),false),'role',max(role),'password_initialized',coalesce(bool_or(password_hash IS NOT NULL),false)) FROM taxiassur.auth_users WHERE lower(email)='$safeEmail';" }
& 'F:\TaxiAssur\PostgreSQL\runtime\pgsql\bin\psql.exe' -X -q -A -t -h 127.0.0.1 -U postgres -d taxiassur -c $sql | Set-Content $ReportPath -Encoding UTF8
