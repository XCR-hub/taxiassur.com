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

Required environment variables on the server:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVER_KEY`
- `CLAMSCAN_PATH` if `clamscan` is not in `PATH`

Schedule the worker every 5 to 15 minutes on the server. Documents with `security_scan_status != clean` should remain treated as untrusted until reviewed.

## Current infrastructure dependency

The local PostgreSQL server at `192.168.1.70` is a mirror/read replica, not yet the production primary. Supabase is still used for writes, storage, Edge Functions and several workflows. Cloudflare is still used for DNS, Pages hosting, D1 public cache and Tunnel.
