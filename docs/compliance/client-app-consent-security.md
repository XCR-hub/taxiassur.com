# Client app, consent and document security

## Client app after contract

When a lead is activated as a client, the CRM calls:

- `ensure_client_app_access(p_lead_id)` to create or update `client_portal_users`.
- `send-client-access` to email the dedicated client portal link.

The client portal now exposes:

- `/client/parrainage`
- `/client/confidentialite`

## Consent model

The application uses separate opt-ins:

- `marketing_email`
- `marketing_sms`
- `marketing_phone`
- `partner_cross_sell`
- `behavioral_personalization`

Each change is written to `client_consent_events` through `record_client_consent_event`.
Revocation is available from the client portal through `revoke_client_marketing_consents`.

No hidden phone contact import, mailbox scraping or cross-site navigation tracking should be added. Partner/cross-sell and behavioral personalization require explicit opt-in.

## Turnstile

Frontend:

- Set `VITE_TURNSTILE_SITE_KEY` on Cloudflare Pages.

### Public form protection

When Turnstile is configured, public write paths must validate a token before writing or creating a lead. This includes the homepage hero lead form, the devis form, contact form, public quote request form and newsletter signup forms. The shared hook is `useTurnstileGuard`.

The public lead creation helper and `create-lead-direct` Edge Function also reject incomplete leads before any database write. Required public lead fields are name, email, phone and city.

Supabase Edge Function:

- Deploy `verify-turnstile`.
- Set `TURNSTILE_SECRET_KEY` in Supabase secrets.

The main lead form validates the Turnstile token server-side before creating the lead when a site key is configured.

## Document antivirus scan

Database:

- New uploads are queued in `document_security_scans`.
- `prospect_documents`, `crm_lead_documents` and `client_document_requests` receive scan status columns when the tables exist.

Worker:

```powershell
npm run server:scan-documents-clamav
```

Server installation on `192.168.1.70`:

```powershell
npm run server:install-clamav-document-scan
```

The installer copies the worker to `F:\TaxiAssur\Scripts`, creates `F:\TaxiAssur\Secrets\taxiassur-document-scan.env`, writes logs to `F:\TaxiAssur\Logs`, and registers the Windows scheduled task `TaxiAssurDocumentClamAVScan` every 10 minutes. It leaves the task disabled if `node.exe`, `clamscan.exe`, the ClamAV signature database, `SUPABASE_URL`, or a Supabase server key is missing.

Required environment variables on the server:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVER_KEY`
- `CLAMSCAN_PATH` if `clamscan` is not in `PATH`

Documents with `security_scan_status != clean` should remain treated as untrusted until reviewed.

Current server state on `192.168.1.70` / `SERVEUR-XCR` as of 2026-07-29:

- ClamAV `1.5.3` is installed in `C:\Program Files\ClamAV`.
- Signature databases are stored in `F:\TaxiAssur\ClamAV\db`.
- `TaxiAssurDocumentClamAVScan` runs every 10 minutes and returned task result `0` after installation.
- `TaxiAssurClamAVFreshclamUpdate` refreshes signatures every 6 hours.
- Latest worker log showed `Pending scans: 0` after activation.


## Local verification

Run this static check before deployments that touch the client app, consent, referral, Turnstile or document scan flows:

```powershell
npm run verify:client-compliance
```

The check verifies the expected post-contract client access wiring, separate opt-ins, revocation, capped referral reward, Turnstile verification and document antivirus scan hooks. It also fails if browser contact import or mailbox/contact harvesting patterns are introduced.

## Current infrastructure dependency

The local PostgreSQL server at `192.168.1.70` is a mirror/read replica, not yet the production primary. Supabase is still used for writes, storage, Edge Functions and several workflows. Cloudflare is still used for DNS, Pages hosting, D1 public cache and Tunnel.
