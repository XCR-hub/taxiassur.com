#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const SKIP_LIVE = ['1', 'true', 'yes'].includes(String(process.env.SKIP_LIVE_SEO_CHECK || '').toLowerCase());
const LIVE_TIMEOUT_MS = Number(process.env.SEO_LIVE_TIMEOUT_MS || 12000);
const MIN_SITEMAP_URLS = Number(process.env.MIN_SITEMAP_URLS || 800);

const checks = [];
const warnings = [];

function relPath(file) {
  return path.join(ROOT, file);
}

function read(file) {
  return fs.readFileSync(relPath(file), 'utf8');
}

function exists(file) {
  return fs.existsSync(relPath(file));
}

function addCheck(name, ok, details = '') {
  checks.push({ name, ok, details });
  const suffix = details ? ` - ${details}` : '';
  console.log(`${ok ? 'OK ' : 'ERR'} - ${name}${suffix}`);
}

function addWarning(message) {
  warnings.push(message);
  console.log(`WARN - ${message}`);
}

function extractLocs(sitemap) {
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function sitemapSource() {
  const buildSitemap = 'dist/sitemap.xml';
  if (exists(buildSitemap)) {
    return { file: buildSitemap, label: 'build sitemap' };
  }
  return { file: 'public/sitemap.xml', label: 'baseline sitemap' };
}

function checkSitemapRules(label, locs) {
  addCheck(`${label} contains at least ${MIN_SITEMAP_URLS} URLs`, locs.length >= MIN_SITEMAP_URLS, `${locs.length} URLs`);
  addCheck(`${label} stays below Google file URL limit`, locs.length <= 50000, `${locs.length}/50000 URLs`);
  addCheck(`${label} uses canonical apex host only`, locs.every((url) => url.startsWith(`${SITE_URL}/`) || url === `${SITE_URL}/`));
  addCheck(`${label} has no www URLs`, locs.every((url) => !url.includes('www.taxiassur.com')));
  addCheck(`${label} has no Cloudflare preview URLs`, locs.every((url) => !url.includes('pages.dev')));
  addCheck(`${label} excludes /m/ mirror URLs`, locs.every((url) => !url.includes('/m/')));
  addCheck(`${label} excludes legacy /ville/ URLs`, locs.every((url) => !url.includes('/ville/')));
  addCheck(`${label} excludes query-string duplicates`, locs.every((url) => !url.includes('?')));
}

function canonicalUrls(html) {
  const links = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi) || [];
  return links
    .map((tag) => {
      const href = tag.match(/href=["']([^"']+)["']/i);
      return href ? href[1] : null;
    })
    .filter(Boolean);
}

function titleOf(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function controller(ms) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), ms);
  return { abort, timer };
}

async function fetchText(url) {
  const { abort, timer } = controller(LIVE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'TaxiAssurSEOHealth/1.0',
      },
      signal: abort.signal,
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

function checkLocalFiles() {
  addCheck('robots.txt exists', exists('public/robots.txt'));
  addCheck('sitemap.xml exists', exists('public/sitemap.xml'));
  addCheck('sitemap-images.xml exists', exists('public/sitemap-images.xml'));
  addCheck('llms.txt exists', exists('public/llms.txt'));
  addCheck('ai.txt exists', exists('public/ai.txt'));
  addCheck('Cloudflare middleware exists', exists('functions/_middleware.js'));

  const robots = read('public/robots.txt');
  addCheck('robots exposes main sitemap', /Sitemap:\s*https:\/\/taxiassur\.com\/sitemap\.xml/i.test(robots));
  addCheck('robots exposes image sitemap', /Sitemap:\s*https:\/\/taxiassur\.com\/sitemap-images\.xml/i.test(robots));
  addCheck('robots keeps legacy /ville/ duplicate paths blocked', /^\s*Disallow:\s*\/ville\/\s*$/m.test(robots));
  addCheck('robots does not block /villes index page', !/^\s*Disallow:\s*\/villes\/?\s*$/m.test(robots));
  addCheck('robots blocks private backoffice paths', /^\s*Disallow:\s*\/backoffice\/?\s*$/m.test(robots));
  addCheck('robots blocks client areas', /^\s*Disallow:\s*\/espace-client\s*$/m.test(robots));

  const localSitemap = sitemapSource();
  const sitemap = read(localSitemap.file);
  const locs = extractLocs(sitemap);
  const locSet = new Set(locs);
  checkSitemapRules(localSitemap.label, locs);

  const requiredUrls = [
    '/',
    '/assurance-taxi',
    '/devis-assurance-taxi',
    '/prix-assurance-taxi',
    '/quelle-assurance-taxi',
    '/courtier-assurance-taxi',
    '/faq',
    '/blog',
    '/actualites',
    '/villes',
  ];
  for (const route of requiredUrls) {
    const canonical = route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`;
    addCheck(`sitemap includes ${route}`, locSet.has(canonical));
  }

  const middleware = read('functions/_middleware.js');
  addCheck('middleware injects HTMLRewriter SEO head', middleware.includes('HTMLRewriter') && middleware.includes('taxiassur:seo-edge'));
  addCheck('middleware has assurance taxi metadata', middleware.includes("'/assurance-taxi'") && middleware.includes('Assurance taxi professionnelle'));
  addCheck('middleware has devis metadata', middleware.includes("'/devis-assurance-taxi'"));
  addCheck('middleware handles dynamic city pages', middleware.includes("pathname.startsWith('/assurance-taxi-')"));
  addCheck('middleware handles blog articles', middleware.includes("pathname.startsWith('/blog/')"));
  addCheck('middleware handles news articles', middleware.includes("pathname.startsWith('/actualites/')"));

  const llms = read('public/llms.txt');
  addCheck('llms.txt identifies TaxiAssur', /# TaxiAssur/.test(llms));
  addCheck('llms.txt lists core conversion page', llms.includes('https://taxiassur.com/devis-assurance-taxi'));
  addCheck('llms.txt lists city index', llms.includes('https://taxiassur.com/villes'));

  const ai = read('public/ai.txt');
  addCheck('ai.txt lists public AI access notes', ai.includes('TaxiAssur AI Access Notes'));
  addCheck('ai.txt keeps private areas excluded', ai.includes('/backoffice') && ai.includes('/espace-client'));
}

async function checkLiveSite() {
  if (SKIP_LIVE) {
    console.log('INFO - live SEO checks skipped by SKIP_LIVE_SEO_CHECK');
    return;
  }

  const staticFiles = [
    ['/robots.txt', 'robots.txt'],
    ['/sitemap.xml', 'sitemap.xml'],
    ['/llms.txt', 'llms.txt'],
    ['/ai.txt', 'ai.txt'],
  ];

  for (const [route, label] of staticFiles) {
    const result = await fetchText(`${SITE_URL}${route}?seo-health=${Date.now()}`);
    addCheck(`live ${label} reachable`, result.ok, `status ${result.status}`);
    if (route === '/robots.txt' && result.ok) {
      addCheck('live robots exposes sitemap', result.text.includes('Sitemap: https://taxiassur.com/sitemap.xml'));
      if (/User-agent:\s*(GPTBot|ClaudeBot|Google-Extended|Applebot-Extended)[\s\S]{0,180}Disallow:\s*\//i.test(result.text)) {
        addWarning('Cloudflare managed robots appears to block at least one AI crawler before the project robots.txt rules. Review Cloudflare AI crawl controls if AI discovery is desired.');
      }
    }
    if (route === '/sitemap.xml' && result.ok) {
      const liveLocs = extractLocs(result.text);
      checkSitemapRules('live sitemap', liveLocs);
      addCheck('live sitemap includes /villes', result.text.includes('<loc>https://taxiassur.com/villes</loc>'));
    }
  }

  const routes = [
    '/',
    '/assurance-taxi',
    '/devis-assurance-taxi',
    '/prix-assurance-taxi',
    '/villes',
    '/assurance-taxi-paris',
  ];

  for (const route of routes) {
    const expectedCanonical = route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`;
    const result = await fetchText(`${SITE_URL}${route}?seo-health=${Date.now()}`);
    addCheck(`live ${route} returns HTML`, result.ok && /<html/i.test(result.text), `status ${result.status}`);
    if (!result.ok) continue;

    const canonicals = canonicalUrls(result.text);
    const pageTitle = titleOf(result.text);
    addCheck(`live ${route} has expected canonical`, canonicals.includes(expectedCanonical), canonicals.join(', ') || 'no canonical');
    addCheck(`live ${route} has route-specific title`, /TaxiAssur|assurance taxi/i.test(pageTitle), pageTitle || 'no title');
    addCheck(`live ${route} has edge SEO marker`, result.text.includes('name="taxiassur:seo-edge"') || result.text.includes("name='taxiassur:seo-edge'"));
    if (route !== '/') {
      addCheck(`live ${route} does not keep root canonical`, !canonicals.includes(`${SITE_URL}/`), canonicals.join(', ') || 'no canonical');
    }
  }
}

async function main() {
  console.log('TaxiAssur SEO leadership verification');
  console.log(`Site: ${SITE_URL}`);

  checkLocalFiles();
  await checkLiveSite();

  const failed = checks.filter((check) => !check.ok);
  console.log('');
  console.log(`Checks: ${checks.length - failed.length}/${checks.length} OK`);
  if (warnings.length) console.log(`Warnings: ${warnings.length}`);

  if (failed.length) {
    console.error('SEO verification failed:');
    for (const check of failed) {
      console.error(`- ${check.name}${check.details ? `: ${check.details}` : ''}`);
    }
    process.exit(1);
  }

  console.log('SEO verification passed.');
}

main().catch((error) => {
  console.error('SEO verification crashed:', error);
  process.exit(1);
});