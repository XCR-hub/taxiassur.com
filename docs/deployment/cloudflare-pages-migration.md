# Cloudflare Pages migration - TaxiAssur

Goal: run production on Cloudflare Pages while keeping Vercel available temporarily as rollback.

## Current production

- DNS authority: Cloudflare.
- Current host: Cloudflare Pages.
- Production domain: https://taxiassur.com.
- Supabase remains the backend for CRM, emails, GSC, content generation and Edge Functions.

## Cloudflare Pages build settings

Use these settings in Workers & Pages > Pages:

- Framework preset: React / Vite.
- Build command: `npm run build:cloudflare`.
- Build output directory: `dist`.
- Node version: `22`.
- Root directory: repository root.

## Required Cloudflare Pages environment variables

Set the same production values currently used by the site. Do not commit secret values.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL=https://taxiassur.com`
- `VITE_NOINDEX=false`
- `VITE_GTM_ID`
- `VITE_GTAG_ID` or `VITE_GA_MEASUREMENT_ID`
- `VITE_GOOGLE_CSE_API_KEY`
- `VITE_GOOGLE_CSE_CX`
- OAuth public client IDs and redirect URIs if the social connection screens are used.

Server-side secrets stay in Supabase Edge Function secrets, not Cloudflare Pages. Never expose server secrets through `VITE_*` variables: service role keys, SMTP passwords, AI provider keys, SERP keys, Make tokens, admin passwords, hCaptcha secret keys and payment secrets must remain server-side only.


## Current Cloudflare Pages deployment

- Production preview URL: `https://taxiassur.pages.dev`.
- Dedicated preview alias: `https://cloudflare-preview.taxiassur.pages.dev`.
- Staging custom domain: `https://cf.taxiassur.com`.
- Project name: `taxiassur`.
- Production branch: `main`.

Cloudflare technical hostnames are blocked from search indexing through `public/_headers`:

- `https://:project.pages.dev/*`
- `https://:version.:project.pages.dev/*`
- `https://cf.taxiassur.com/*`

The canonical production domain `https://taxiassur.com` is now served by Cloudflare Pages. Vercel should be kept available temporarily only as rollback.

## GitHub Actions deployment

The workflow `.github/workflows/deploy-cloudflare-pages.yml` builds with `npm run build:cloudflare` on every push to `main`.

It deploys to Cloudflare Pages only when these GitHub repository secrets exist:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Recommended token permissions for deployment: Cloudflare Pages edit access on the account/project. DNS changes require a separate token or expanded token with `Zone:DNS:Edit` and `Zone:Zone:Read` for `taxiassur.com`.

The deployment workflow also runs:

- `npm run security:scan-secrets`;
- `npm run verify:client-compliance`;
- `npm run build:cloudflare`;
- `npm run verify:production` after Cloudflare Pages deployment, with the deployed commit expected to match `github.sha` and strict freshness checks for the D1 public cache and PostgreSQL mirror.

The workflow builds Turnstile into the Vite bundle with `VITE_CAPTCHA_PROVIDER=turnstile` and `VITE_TURNSTILE_SITE_KEY`. Prefer setting `VITE_TURNSTILE_SITE_KEY` as a GitHub repository variable when rotating the public site key.

The workflow `.github/workflows/production-health-check.yml` runs every 2 hours and checks the public site, D1, the PostgreSQL public proxy, public count alignment, and freshness metadata without requiring a commit match.

## Redirects

Cloudflare Pages uses `public/_redirects`, copied into `dist/_redirects` by Vite.

The `www.taxiassur.com` to `taxiassur.com` canonical redirect is handled by `functions/_middleware.js`, because Cloudflare Pages `_redirects` does not support domain-level redirects. The middleware preserves the path and query string and returns a 301 redirect.

## Legacy PHP API

The old PHP API files have been moved to `legacy/php-api` and are not deployed by Cloudflare Pages or Vercel. Static hosts must never publish PHP files containing operational configuration. Browser-facing actions should use Supabase Edge Functions or direct Supabase RPC calls with the anon key only.

## Safe migration sequence

1. Create a Cloudflare Pages project from GitHub without touching `taxiassur.com`.
2. Deploy preview on the generated `*.pages.dev` URL.
3. Attach a staging custom domain, for example `cf.taxiassur.com`.
4. Test: homepage, forms, backoffice login, prospect portal, blog, FAQ, city pages, `/sitemap.xml`, `/robots.txt`, and redirects.
5. Submit staging only for manual tests, not Google indexing.
6. Production DNS now points apex and `www` to Cloudflare Pages.
7. Keep Vercel for rollback until Google Search Console shows stable crawling on Cloudflare.
8. Remove Vercel only after at least one clean GSC crawl cycle.

## Local validation

Run:

```bash
npm run build:cloudflare
```

This builds the site and validates Cloudflare `_redirects` and `_headers` compatibility.

## DNS cutover status

Production cutover completed on 2026-07-27.

Active Cloudflare Pages custom domains:

- `taxiassur.com`
- `www.taxiassur.com`
- `cf.taxiassur.com`

Active web DNS records:

- `taxiassur.com` CNAME -> `taxiassur.pages.dev`, proxied
- `www.taxiassur.com` CNAME -> `taxiassur.pages.dev`, proxied
- `cf.taxiassur.com` CNAME -> `taxiassur.pages.dev`, proxied, noindex staging

`www.taxiassur.com` redirects to the canonical apex domain through `functions/_middleware.js`.

Mail DNS records (`MX`/`TXT`) remain unchanged.

Rollback DNS target if Cloudflare Pages must be backed out quickly:

- `taxiassur.com` A -> `76.76.21.21`, DNS only
- `www.taxiassur.com` A -> `76.76.21.21`, DNS only

Keep Vercel active as rollback until Search Console confirms stable crawling on Cloudflare. The GitHub Actions workflow deploys Cloudflare Pages when `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are present as repository secrets.
