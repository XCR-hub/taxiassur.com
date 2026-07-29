# TaxiAssur Cloudflare Tunnel for PostgreSQL Read API

## Current State

The local PostgreSQL read API is exposed through Cloudflare Tunnel, not by opening a port on `192.168.1.70`.

```text
Tunnel name: taxiassur-postgres-read-api
Tunnel ID: 8991799c-6ed6-45a9-9ce4-f1b3e7c9c466
Public hostname: https://postgres-read-api.taxiassur.com
Origin service: http://localhost:8791
Server task: TaxiAssur Cloudflare Postgres Tunnel
Server launcher: F:\TaxiAssur\Scripts\start-taxiassur-postgres-cloudflare-tunnel.ps1
Server token file: F:\TaxiAssur\Secrets\cloudflare-taxiassur-postgres-tunnel-token.txt
Server log: F:\TaxiAssur\Logs\taxiassur-postgres-cloudflare-tunnel.log
```

The hostname uses a proxied CNAME to:

```text
8991799c-6ed6-45a9-9ce4-f1b3e7c9c466.cfargotunnel.com
```

## Install Or Repair

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-server-cloudflare-postgres-tunnel.ps1
```

With stored Windows credentials:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-server-cloudflare-postgres-tunnel.ps1 -UseStoredCredentials
```

To also create or repair DNS, provide a Cloudflare API token with `Zone DNS Edit` on `taxiassur.com`:

```powershell
$env:CLOUDFLARE_DNS_API_TOKEN = '<token>'
powershell -ExecutionPolicy Bypass -File scripts\install-server-cloudflare-postgres-tunnel.ps1 -UseStoredCredentials -ConfigureDns
Remove-Item Env:\CLOUDFLARE_DNS_API_TOKEN
```

If the environment variable is not set, the script asks for the token securely.

## Verification

```powershell
npx wrangler tunnel list
Resolve-DnsName postgres-read-api.taxiassur.com
curl.exe -sS https://postgres-read-api.taxiassur.com/health
```

Expected public health response:

```json
{"ok":true,"service":"taxiassur-postgres-read-api","database":"taxiassur","schema":"supabase_rest"}
```

Protected API endpoints must return `401` without the internal bearer token:

```powershell
curl.exe -sS -o NUL -w '%{http_code}' https://postgres-read-api.taxiassur.com/api/health
```

With the server token from `F:\TaxiAssur\Secrets\taxiassur-postgres-read-api.env`, `/api/health` should return counts for the mirrored public tables.

## Security Notes

- Do not expose `192.168.1.70:8791` directly.
- Keep the Node API bound to `127.0.0.1`.
- Keep `/api/*` behind `TAXIASSUR_READ_API_TOKEN`.
- The tunnel connector token and API bearer token stay on the server in `F:\TaxiAssur\Secrets`.
- Before using this as a production dependency, add Cloudflare Access or a Worker proxy in front of the protected API.

This tunnel does not make the local PostgreSQL mirror the primary database. Supabase remains primary until the write paths, auth, storage, edge functions, and rollback plan are migrated.
