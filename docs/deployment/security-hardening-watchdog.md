# TaxiAssur self-host security hardening

## Scope

This checklist is for a self-hosted TaxiAssur stack on the owned server, with customer contracts, documents, payments and CRM data treated as sensitive business data.

It does not claim that the current production stack is fully independent from Cloudflare or Supabase. See `docs/deployment/supabase-exit-plan.md` for the verified dependency state.

## TLS and reverse proxy

- Put the public site behind Caddy, Traefik or Nginx with ACME automatic renewal.
- Redirect all HTTP traffic to HTTPS.
- Enable HSTS after verifying renewal works.
- Keep TLS certificates and private keys outside the web root.
- Monitor certificate expiry daily and alert if expiry is under 21 days.

## Network exposure

- Expose only ports 80 and 443 publicly.
- Keep PostgreSQL, document storage, admin APIs and backup shares private.
- Allow admin access only through VPN or a hardened bastion.
- Deny direct LAN database exposure from the browser.
- Rate-limit login, lead, upload, payment and request endpoints.

## Anti-bot

Cloudflare Turnstile is useful but is still a Cloudflare dependency. If the target is zero Cloudflare, keep the application anti-bot abstraction and switch provider to a self-hosted or non-Cloudflare challenge.

Minimum fallback without Cloudflare:

- Honeypot fields on public forms.
- Time-on-form checks.
- Per-session and per-IP rate limits at reverse proxy and API.
- Server-side validation before every write.
- Manual review queue for suspicious leads.

## Antivirus and uploads

- Keep ClamAV installed on the server.
- Run `freshclam` at least every 6 hours.
- Scan uploaded documents before staff download or forward them.
- Treat `security_scan_status != clean` as blocked.
- Keep scan logs for incident review.
- Quarantine infected documents and keep the original file inaccessible to the app.

## Watchdog and monitoring

Monitor these services every 1 to 5 minutes:

- Reverse proxy.
- App backend/API.
- PostgreSQL.
- Document scanner.
- Backup task.
- Disk free space.
- Certificate expiry.
- Mail queue.
- Client portal access outbox (`npm run server:process-client-access-outbox`).

Suggested actions:

- Restart unhealthy app services once.
- Alert human operator if the second check fails.
- Never auto-delete data as a recovery action.
- Record watchdog actions in append-only logs.

## Backups

- Run encrypted database backups at least daily.
- Keep one local copy, one offline copy and one remote encrypted copy.
- Test restore monthly on a separate instance.
- Keep active PostgreSQL data outside any synced folder.
- Alert when the last successful backup is older than 24 hours.

## Endpoint and server protection

- Keep Windows, Node.js, PostgreSQL, ClamAV and reverse proxy packages patched.
- Use least-privilege service accounts.
- Enable Windows Defender or Acronis Cyber Protect on the server.
- Exclude live PostgreSQL data from real-time antivirus locking if vendor guidance requires it, but scan backups and uploads.
- Enable EDR alerts for unknown executable creation, credential dumping, web shell patterns and suspicious scheduled tasks.

## Application controls

- Enforce explicit consent before analytics, marketing tags, cross-sell profiling or referral click analytics.
- Keep unsubscribe and consent revocation self-service.
- Do not import phone contacts, browser history or mailbox contacts from the client device.
- Do not send insurer dossiers automatically without human review.
- Store audit logs for dossier sends, consent changes, document downloads, document scans, payment actions and contract changes.

## Human supervision gates

Keep these actions behind a human validation step:

- Sending a complete dossier to an insurer.
- Sending a marketing sequence to a newly imported list.
- Marking a contract as active if required documents are missing.
- Overriding a blocked antivirus result.
- Exporting client data.
- Sharing data with a partner site.
