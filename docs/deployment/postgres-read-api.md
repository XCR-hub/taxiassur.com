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
