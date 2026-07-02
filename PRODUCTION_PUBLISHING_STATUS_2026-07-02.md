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

## 2026-07-02 continuation: Bolt recovery and safe publish check

- Bolt project recovered and confirmed:
  - Title: `TAXI ASSUR PRINCIPAL`
  - Project URL: `https://bolt.new/~/github-mcmcpmfr`
  - Project id: `61788020`
  - Latest selected snapshot: `Publish application`
  - Snapshot created at: `2026-06-23T08:55:03.217Z`
- Local recovered source:
  `C:\Users\TCERD\Documents\GitHub\taxiassur-bolt-recovery\projects\TAXI_ASSUR_PRINCIPAL_2026-06-23_publish_application`
- Local working repo:
  `C:\Users\TCERD\Documents\GitHub\taxiassur.com`

Comparison summary between the recovered Bolt project and the local working
repo, excluding generated folders:

- Common files: 1812
- Identical raw files: 47
- Identical after line-ending normalization: 1745
- Real differences after normalization: 20
- Files only in local working repo: 27
- Files only in recovered Bolt project: 4

The large raw diff count is therefore mostly line-ending noise. The local
working repo is the practical publishing base because it contains the recovered
Bolt source plus the hMail/Supabase and Netlify publication changes.

Latest controlled publish validation:

- Command used:
  `npm.cmd run publish -- --skip-git --skip-supabase --skip-bolt`
- Result: successful build and deploy to the controlled Netlify site.
- Controlled production URL:
  `https://taxiassur-com-xcr.netlify.app`
- Unique deploy URL:
  `https://6a46cf5dcc193e1c93be0616--taxiassur-com-xcr.netlify.app`
- Verified online deploy info:
  - Commit: `bb92712f65fd1ba14d7be673b1af1f9743ffe464`
  - Short commit: `bb92712f`
  - Repository: `https://github.com/XCR-hub/taxiassur.com.git`

Live `taxiassur.com` status after this operation:

- `taxiassur.com` still responds from Netlify.
- Root HTML still reports the existing live size/hash profile and the old live
  assets, including `/assets/index-BhxZQDh0.js`.
- The public domain was not replaced by the controlled Netlify site.

Bolt direct publish status:

- The local publish script attempted the Bolt step with:
  `npm.cmd run publish -- --skip-git --skip-supabase --skip-netlify`
- Result: build succeeded, but the Bolt webhook failed because
  `api.bolt.new` does not resolve from this machine.
- The Bolt editor was opened through the authenticated browser session, but the
  `Publish` button remained disabled while the project view was loaded.

Safe publication commands:

- Publish to controlled staging only:
  `npm.cmd run publish -- --skip-git --skip-supabase --skip-bolt`
- Build only:
  `npm.cmd run build`
- Do not run a live-domain migration until the existing Bolt/Netlify production
  project is controllable or the custom domain transfer is intentionally
  performed after validation.
