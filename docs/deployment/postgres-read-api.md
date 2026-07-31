# TaxiAssur PostgreSQL Read API

## Role

This API is the first controlled layer between Cloudflare and the local PostgreSQL mirror on `192.168.1.70`.

It is deliberately limited:

- read only;
- local listener by default on `127.0.0.1:8791`;
- mandatory internal bearer token;
- allowed tables only;
- no CRM, leads, documents, payment, email, SMS or workflow writes.

It does not replace Supabase yet. It is for double-read tests and staged migration.

## Server Install

From the local repository:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-server-postgres-read-api.ps1
```

If credentials are already stored for `192.168.1.70` in Windows Credential Manager:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-server-postgres-read-api.ps1 -UseStoredCredentials
```

Operational note: the scheduled task runs a small PowerShell supervisor (`F:\TaxiAssur\Scripts\start-postgres-read-api.ps1`). The supervisor keeps the task alive, starts `node.exe`, checks `http://127.0.0.1:8791/health`, and restarts the Node API if the local healthcheck fails. This avoids Windows Task Scheduler killing or stalling a detached Node child process.
The script:

- copies `server\postgres-read-api.mjs` to `F:\TaxiAssur\Api`;
- creates or updates PostgreSQL role `taxiassur_read_api` with `SELECT` rights only;
- creates or reuses secrets in `F:\TaxiAssur\Secrets\taxiassur-postgres-read-api.env`;
- creates scheduled task `TaxiAssur PostgreSQL Read API`;
- starts the API locally on the server;
- checks `/health` and `/api/health`.

Local report:

```text
C:\Users\TCERD\taxiassur-postgres-read-api-install-192-168-1-70.json
```

## Verification

```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-server-postgres-read-api.ps1
```

With stored credentials:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-server-postgres-read-api.ps1 -UseStoredCredentials
```

Server-local endpoints:

```text
GET http://127.0.0.1:8791/health
GET http://127.0.0.1:8791/api/health
GET http://127.0.0.1:8791/api/tables
GET http://127.0.0.1:8791/api/read?table=blog_posts&limit=10&status=published
GET http://127.0.0.1:8791/api/item?table=blog_posts&slug=<slug>
```

Endpoints under `/api/*` require:

```text
Authorization: Bearer <TAXIASSUR_READ_API_TOKEN>
```

## Cloudflare Exposure

Do not expose `192.168.1.70:8791` directly on the Internet.

Correct next step:

1. keep the API bound to `127.0.0.1`;
2. install Cloudflare Tunnel on the server;
3. publish an internal hostname such as `postgres-read-api.taxiassur.com` to `http://127.0.0.1:8791`;
4. protect the hostname with Cloudflare Access or a Worker proxy that controls the token;
5. connect one non-critical backoffice endpoint in double-read mode.

## Default Allowed Tables

```text
blog_posts
city_pages
faq_entries
news_articles
gsc_pages
gsc_queries
```

To add a table, update only `TAXIASSUR_READ_API_ALLOWED_TABLES` in the server env file, then restart scheduled task `TaxiAssur PostgreSQL Read API`.

## Limits

The API reads the `supabase_rest` mirror where each row is stored as JSONB in column `data`. It does not implement Supabase Auth, Storage, Realtime, RLS, Edge Functions, crons or webhooks.

## Cloudflare Pages Public Proxy

The browser must never receive `TAXIASSUR_READ_API_TOKEN` directly. Public reads use Cloudflare Pages Functions as a controlled proxy:

```text
GET /api/postgres-public/health
GET /api/postgres-public/list?table=blog_posts&limit=10
GET /api/postgres-public/content?table=blog_posts&slug=<slug>
```

Required Cloudflare Pages secrets:

```text
TAXIASSUR_POSTGRES_READ_API_TOKEN=<server token from F:\TaxiAssur\Secrets\taxiassur-postgres-read-api.env>
TAXIASSUR_POSTGRES_READ_API_URL=https://postgres-read-api.taxiassur.com
```

The proxy allows only public SEO tables and filters unpublished rows before returning data. The frontend public cache order is now D1 first, PostgreSQL mirror second, then the existing Supabase/local fallback in the calling content loaders.

## Production Verification

Run the public production health check after deployments and after mirror sync operations:

```powershell
npm run verify:production
```

The script checks:

- `/assurance-taxi` returns `200`;
- `deploy-info.json` matches the current local Git commit;
- D1 health is OK;
- `/api/postgres-public/health` is OK;
- D1 and PostgreSQL public counts match for blog, city, FAQ, news and GSC cache tables;
- both D1 and PostgreSQL can return at least one blog item.

Optional environment variables:

```powershell
$env:SITE_URL = "https://taxiassur.com"
$env:EXPECTED_COMMIT = "<commit-sha>"
$env:PRODUCTION_HEALTH_REPORT = "C:\Users\TCERD\taxiassur-production-health-latest.json"
npm run verify:production

# For scheduled D1/cache checks where the live commit does not matter:
$env:EXPECTED_COMMIT = "skip"
npm run verify:production
```
