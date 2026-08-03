# Client app, consent and document security

## Client app after contract

When a lead is activated as a client, the CRM calls:

- `ensure_client_app_access(p_lead_id)` to create or update `client_portal_users`.
- `send-client-access` to email the dedicated client portal link.

The database also has `enqueue_client_app_access(p_lead_id)` and trigger coverage on signed/active contracts and client-stage leads. This creates the portal access and queues `client_portal_access_outbox` so the access email can be sent without relying on a front-office click. The `process-client-access-outbox` Edge Function and the server script `server:process-client-access-outbox` claim pending rows, invoke `send-client-access`, retry failed sends with `scheduled_at`/`max_attempts`, and mark each row as `sent`, `pending` retry or `failed` with `last_error`. On the owned Windows server, `server:install-client-access-outbox` installs the `TaxiAssurClientAccessOutbox` scheduled task, stores secrets in `F:\TaxiAssur\Secrets\taxiassur-client-access-outbox.env`, writes logs under `F:\TaxiAssur\Logs`, and disables the task when Node.js or required Supabase server credentials are missing.

The client portal exposes the operational app after contract signature:

- `/client/dashboard`
- `/client/documents`
- `/client/paiements`
- `/client/sinistres`
- `/client/demandes`
- `/client/demandes` for contract questions, endorsements, fleet changes, renewal, premium questions, document/certificate requests and support messages.
- `/client/parrainage`
- `/client/confidentialite`

## Client request center

`/client/demandes` is the post-contract request center. It lets a client create and track service requests for contract questions, endorsements, fleet changes, vehicle changes, renewal, documents/certificates, premium questions, payment questions, support messages and partner offer questions.

Each request is created through `create_client_portal_request`, displayed through `get_client_portal_requests`, linked to the resolved CRM `lead_id`, and queued as a `crm_automation_events` item when that table exists. The request stores a `consent_snapshot` so later sales or service automation can prove which choices were active when the client submitted the request.

Partner offer requests require explicit `partner_cross_sell` consent. Behavioral personalization is limited to actions inside the TaxiAssur application and requires explicit `behavioral_personalization` consent. No hidden phone contact import, mailbox scraping, external browser history import or cross-site navigation collection is authorized.

## Consent model

The application uses separate opt-ins:

- `marketing_email`
- `marketing_sms`
- `marketing_phone`
- `partner_cross_sell`
- `behavioral_personalization`

Each change is written to `client_consent_events` through `record_client_consent_event`. Revocation is available from the client portal through `revoke_client_marketing_consents`.

No hidden phone contact import, mailbox scraping, browser history access, external browser IP lookup or cross-site navigation tracking should be added. Partner/cross-sell and behavioral personalization require explicit opt-in. Referral click analytics is internal only and runs only after analytics consent. Any future sales email automation must filter recipients by the corresponding consent state and keep a traceable unsubscribe/revocation path.

## Public analytics and marketing tags

The public site must not load Google Tag Manager, Google Analytics or marketing pixels from `index.html` before consent. Runtime choices are stored under `taxiassur_privacy_consent` and managed by `src/lib/privacy-consent.ts` plus `src/components/PrivacyConsentBanner.tsx`.

Allowed public choices are separate:

- analytics measurement
- marketing tags
- behavioral personalization limited to TaxiAssur navigation

Visitors can reopen choices from `/policy?privacy=1` or the policy page button. Refusal removes local analytics and behavioral storage keys. Public lead forms must not request browser geolocation automatically; geolocation prefill is allowed only after behavioral personalization consent. Page tracking stores sanitized URLs without query strings and starts only after analytics consent.

## Email tracking

Transactional email sends may be logged in `email_sends` for operational traceability. Open pixels, click redirects and email IP geolocation are disabled by default and must not be used for sales profiling unless explicit tracking consent is recorded.

The active safeguards are:

- `send-email-universal`, `send-crm-email` and `send-newsletter-universal` only inject tracking links/pixels when tracking is requested and consent metadata is present.
- `track-email-open` and `track-email-click` refuse to write open/click events unless the related `email_sends.metadata.email_tracking_allowed` is `true`.
- `geolocate-email-interaction` requires a service-role request, `ENABLE_EMAIL_GEOLOCATION=true`, and `email_sends.metadata.email_geolocation_allowed=true`.
- `src/lib/crm-channel-engine.ts` does not request tracking by default.
## Referral program

`/client/parrainage` lets a client sponsor a filleul only after confirming that the filleul allowed TaxiAssur to receive the contact details. The default reward is deliberately capped (`reward_amount: 25`, `reward_type: 'gift'`) so the program remains attractive without creating an excessive acquisition cost.

## Turnstile

Frontend:

- The TaxiAssur Cloudflare Turnstile widget is configured for `taxiassur.com` and `www.taxiassur.com`.
- `public/env-config.js` exposes the public `VITE_TURNSTILE_SITE_KEY` and sets `VITE_CAPTCHA_PROVIDER=turnstile`.
- `src/lib/turnstile.ts` reads both Vite build-time variables and runtime `window.ENV_CONFIG` values.

### Public form protection

When Turnstile is configured, public write paths must validate a token before writing or creating a lead. This includes the homepage hero lead form, the devis form, contact form, public quote request form, newsletter signup forms and the client request center. The shared hook is `useTurnstileGuard`.

The public lead creation helper and `create-lead-direct` Edge Function also reject incomplete leads before any database write. Required public lead fields are name, email, phone and city.

Supabase Edge Function:

- Deploy `verify-turnstile`.
- Set `TURNSTILE_SECRET_KEY` in Supabase secrets.
- Optional: set `TURNSTILE_ALLOWED_HOSTNAMES`; default is `taxiassur.com,www.taxiassur.com`.

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

The check verifies the expected post-contract client access wiring, client access outbox worker, separate opt-ins, revocation, capped referral reward, consent-gated email tracking, Turnstile verification, request center consent snapshots and document antivirus scan hooks. It also fails if browser contact import, mailbox/contact harvesting or browser-history access patterns are introduced.

## Current infrastructure dependency

The local PostgreSQL server at `192.168.1.70` is a mirror/read replica, not yet the production primary. Supabase is still used for writes, storage, Edge Functions and several workflows. Cloudflare is still used for DNS, Pages hosting, D1 public cache, Tunnel and Turnstile when enabled. If the target is zero Cloudflare, replace Turnstile with a non-Cloudflare anti-bot provider or the self-host fallback described in `docs/deployment/security-hardening-watchdog.md`.

To remove those dependencies, the next architecture step is to promote the local PostgreSQL server or another owned PostgreSQL host to production primary, replace Supabase Storage/Edge Functions, move DNS/hosting/tunnel away from Cloudflare, and add independent TLS renewal, WAF/rate limiting, monitoring, backup, EDR and incident response.
