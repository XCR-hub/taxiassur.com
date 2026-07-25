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