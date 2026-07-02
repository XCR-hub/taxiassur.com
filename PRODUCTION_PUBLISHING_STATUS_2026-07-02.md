# TaxiAssur Production Publishing Status - 2026-07-02

## Current public production

- Public domain: `https://taxiassur.com`
- Hosting: Netlify/Bolt project currently attached to the domain.
- Project id visible from the live Bolt badge: `c9988522-9589-4c4d-bdc0-c2f54a324b42`
- Main live bundle observed on 2026-07-02: `/assets/index-BhxZQDh0.js`
- Root HTML SHA256 observed on 2026-07-02:
  `B3394CDE2D5195AFA8FF617F933C2764C0041C154925B8259768C5DE20E63542`

This is the current production base to preserve. Do not replace the public
domain with another Netlify site until the replacement build is confirmed to
match the live production base or the existing Bolt/Netlify project is under
our control.

## Controlled Netlify development/publish site

- Site: `https://taxiassur-com-xcr.netlify.app`
- Site id: `9719283a-c221-4e19-8a78-72e75e0f7393`
- Last verified deploy commit: `39e5d251`
- Verification endpoint: `https://taxiassur-com-xcr.netlify.app/deploy-info.json`

`npm run publish` now deploys directly to this controlled Netlify site when no
Netlify build hook is configured. This is useful for development validation, but
it is not yet the public `taxiassur.com` production site.

## Production snapshot backup

- Local snapshot path:
  `C:\Users\TCERD\Documents\GitHub\taxiassur-production-snapshots\20260702-213452`
- Snapshot files downloaded: 95
- Snapshot download failures: 0
- Backup Netlify site:
  `https://taxiassur-live-snapshot-20260702-xcr.netlify.app`
- Backup site id: `e5d62941-6567-41ae-a1dd-99934cf81776`

The snapshot root HTML hash matches the live `taxiassur.com` root HTML hash as
captured on 2026-07-02. The backup site is a restore point for the current live
base and must not be used as the ongoing development target.

## Domain blocker

Netlify refuses to attach `taxiassur.com` and `www.taxiassur.com` to the
controlled site because both hostnames are already attached to project
`c9988522-9589-4c4d-bdc0-c2f54a324b42`. The current Netlify account does not
have access to that project.

To publish changes directly on `taxiassur.com`, one of these must happen first:

1. Recover access to the existing Bolt/Netlify project
   `c9988522-9589-4c4d-bdc0-c2f54a324b42`.
2. Have Bolt/Netlify release or transfer the custom domain.
3. Use DNS/domain ownership to move the domain only after the replacement build
   has been validated against the current production base.

Until then, keep `taxiassur.com` untouched.
