# Cloudflare Pages migration - TaxiAssur

Goal: keep Vercel active while preparing a Cloudflare Pages deployment that can replace it later.

## Current production

- DNS authority: Cloudflare.
- Current host: Vercel.
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
- Project name: `taxiassur`.
- Production branch: `main`.

Cloudflare technical hostnames are blocked from search indexing through `public/_headers`:

- `https://:project.pages.dev/*`
- `https://:version.:project.pages.dev/*`
- `https://cf.taxiassur.com/*`

The canonical production domain remains `https://taxiassur.com` until DNS is deliberately switched from Vercel to Cloudflare Pages.

## GitHub Actions deployment

The workflow `.github/workflows/deploy-cloudflare-pages.yml` builds with `npm run build:cloudflare` on every push to `main`.

It deploys to Cloudflare Pages only when these GitHub repository secrets exist:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Recommended token permissions for deployment: Cloudflare Pages edit access on the account/project. DNS changes require a separate token or expanded token with `Zone:DNS:Edit` and `Zone:Zone:Read` for `taxiassur.com`.

## Redirects

Cloudflare Pages uses `public/_redirects`, copied into `dist/_redirects` by Vite.

The `www.taxiassur.com` to `taxiassur.com` redirect is not stored in `_redirects`; Cloudflare Pages `_redirects` does not support domain-level redirects. Create a Cloudflare Bulk Redirect or Redirect Rule:

- If: `http.host eq "www.taxiassur.com"`
- Then: redirect to `https://taxiassur.com${http.request.uri.path}`
- Preserve query string: enabled
- Status: 301 or 308

## Legacy PHP API

The old PHP API files have been moved to `legacy/php-api` and are not deployed by Cloudflare Pages or Vercel. Static hosts must never publish PHP files containing operational configuration. Browser-facing actions should use Supabase Edge Functions or direct Supabase RPC calls with the anon key only.

## Safe migration sequence

1. Create a Cloudflare Pages project from GitHub without touching `taxiassur.com`.
2. Deploy preview on the generated `*.pages.dev` URL.
3. Attach a staging custom domain, for example `cf.taxiassur.com`.
4. Test: homepage, forms, backoffice login, prospect portal, blog, FAQ, city pages, `/sitemap.xml`, `/robots.txt`, and redirects.
5. Submit staging only for manual tests, not Google indexing.
6. When staging is validated, switch the apex DNS/custom domain from Vercel to Cloudflare Pages.
7. Keep Vercel for rollback until Google Search Console shows stable crawling on Cloudflare.
8. Remove Vercel only after at least one clean GSC crawl cycle.

## Local validation

Run:

```bash
npm run build:cloudflare
```

This builds the site and validates Cloudflare `_redirects` and `_headers` compatibility.
## DNS cutover blocker

`cf.taxiassur.com` is configured as a Cloudflare Pages custom domain candidate, but it does not resolve until the DNS record exists in Cloudflare.

Staging DNS record needed:

- Type: `CNAME`
- Name: `cf`
- Target: `taxiassur.pages.dev`
- Proxy status: proxied

Final cutover, only after staging tests pass:

- Attach `taxiassur.com` and `www.taxiassur.com` as Cloudflare Pages custom domains.
- Point apex `@` to `taxiassur.pages.dev` with Cloudflare CNAME flattening/proxying.
- Point `www` to `taxiassur.pages.dev` or keep `www` as a Cloudflare redirect to apex.
- Keep Vercel active as rollback until Search Console confirms stable crawling.

The current local Wrangler login can deploy Pages but cannot edit DNS records. To complete the DNS work programmatically, provide a Cloudflare API token with `Zone:DNS:Edit` and `Zone:Zone:Read` scoped to `taxiassur.com`.
