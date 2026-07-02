# TaxiAssur independent publishing - 2026-07-02

## Current status

- Local source of truth:
  `C:\Users\TCERD\Documents\GitHub\taxiassur.com`
- Recovered Bolt project:
  `TAXI ASSUR PRINCIPAL`, snapshot `Publish application`, 2026-06-23.
- Controlled Netlify validation site:
  `https://taxiassur-com-xcr.netlify.app`
- Controlled Vercel project:
  `xcr-hubs-projects/taxiassur.com`
- Public Vercel validation URL:
  `https://taxiassurcom-xcr-hubs-projects.vercel.app`
- Live public domain:
  `https://taxiassur.com`

The live public domain was moved from the previous Bolt/Netlify DNS target to
Vercel on 2026-07-03 at about 00:10 Europe/Paris time. The previous production
base remains backed up locally and on the snapshot Netlify site documented in
`PRODUCTION_PUBLISHING_STATUS_2026-07-02.md`.

## Publishing commands

- Publish independently from Bolt, including Vercel:
  `npm.cmd run publish:independent -- "Your commit message"`
- Publish Vercel only:
  `npm.cmd run publish:vercel -- "Your commit message"`
- Publish to controlled Netlify staging only:
  `npm.cmd run publish:staging`
- Validate a Vercel deployment without promoting custom domains:
  `npm.cmd run publish:vercel:validate`
- Legacy Bolt workflow only if needed:
  `npm.cmd run publish:with-bolt -- "Your commit message"`

Bolt is skipped by default. It is used only with `--with-bolt` or
`PUBLISH_WITH_BOLT=1`.

## Vercel project details

- Vercel account/scope: `xcr-hubs-projects`
- Project name: `taxiassur.com`
- Project id: `prj_4u3um01qL8VRl5mOJSh8E7Cq6RaO`
- Framework: Vite
- Build command: `npm run build`
- Install command: `npm ci`
- Output directory: `dist`
- Node.js version: 24.x

Custom domains added to the Vercel project:

- `taxiassur.com`
- `www.taxiassur.com`

## DNS switch completed

The DNS zone is currently on Cloudflare:

- `arely.ns.cloudflare.com`
- `rocky.ns.cloudflare.com`

Previous observed records on 2026-07-02:

- `taxiassur.com A 75.2.60.5`
- `www.taxiassur.com CNAME site-dns.bolt.host`
- `taxiassur.com MX 10 mail.xcr.fr`

The live domain was moved to Vercel by changing only the web records in
Cloudflare. MX/TXT records were kept unchanged:

- Apex:
  `taxiassur.com A 76.76.21.21`
- `www`:
  `www.taxiassur.com A 76.76.21.21`

Verification completed after the DNS change:

- `taxiassur.com` resolves to `76.76.21.21`.
- `www.taxiassur.com` resolves to `76.76.21.21`.
- `https://taxiassur.com` returns HTTP 200 from Vercel.
- `https://www.taxiassur.com` returns HTTP 200 from Vercel.
- `https://taxiassur.com/backoffice/login` returns HTTP 200 from Vercel.
- Vercel production deployment `dpl_2dEkZPJCqUELDdFLWaBCETsHwddp` is ready and
  has aliases for both `taxiassur.com` and `www.taxiassur.com`.

## Rollback

If the custom domain switch must be rolled back, restore these Cloudflare web
records:

- `taxiassur.com A 75.2.60.5`
- `www.taxiassur.com CNAME site-dns.bolt.host`

Mail records must remain untouched in both directions.
