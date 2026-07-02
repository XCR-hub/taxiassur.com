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
- Current live public domain:
  `https://taxiassur.com`

The live public domain has not been moved yet. On 2026-07-02, it still points
to the existing Bolt/Netlify production base, which must be preserved until the
DNS switch is deliberate.

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

## DNS switch still required

The DNS zone is currently on Cloudflare:

- `arely.ns.cloudflare.com`
- `rocky.ns.cloudflare.com`

Current observed records on 2026-07-02:

- `taxiassur.com A 75.2.60.5`
- `www.taxiassur.com CNAME site-dns.bolt.host`
- `taxiassur.com MX 10 mail.xcr.fr`

To move the live domain to Vercel while keeping mail intact, change only the web
records in Cloudflare and keep MX/TXT records unchanged:

- Change apex:
  `taxiassur.com A 76.76.21.21`
- Change `www` according to Vercel verification output. The Vercel CLI currently
  recommends:
  `www.taxiassur.com A 76.76.21.21`

After the DNS change:

1. Run `vercel.cmd domains verify taxiassur.com`.
2. Run `vercel.cmd domains verify www.taxiassur.com`.
3. Check `https://taxiassur.com`.
4. Check `https://www.taxiassur.com`.
5. Confirm the site responds from Vercel and the app routes work.

## Rollback

If the custom domain switch must be rolled back, restore these Cloudflare web
records:

- `taxiassur.com A 75.2.60.5`
- `www.taxiassur.com CNAME site-dns.bolt.host`

Mail records must remain untouched in both directions.
