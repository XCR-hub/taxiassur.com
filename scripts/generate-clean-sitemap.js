import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const MIN_SITEMAP_URLS = Math.max(1, Number(process.env.MIN_SITEMAP_URLS || 800));
const PUBLIC_LIST_LIMIT = Math.max(1, Math.min(100, Number(process.env.PUBLIC_SITEMAP_LIST_LIMIT || 100)));
const FETCH_TIMEOUT_MS = Math.max(1500, Math.min(15000, Number(process.env.PUBLIC_SITEMAP_FETCH_TIMEOUT_MS || 8000)));
const DEFAULT_SOURCE_ORDER = ['postgres-public', 'd1'];
const SOURCE_ENDPOINTS = {
  'postgres-public': '/api/postgres-public',
  d1: '/api/d1',
};

const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/assurance-taxi', priority: '0.9', changefreq: 'weekly' },
  { url: '/devis-assurance-taxi', priority: '0.9', changefreq: 'weekly' },
  { url: '/assurance-moto-taxi', priority: '0.8', changefreq: 'weekly' },
  { url: '/assurance-taxi-vtc', priority: '0.8', changefreq: 'weekly' },
  { url: '/assurance-obligatoire-taxi', priority: '0.8', changefreq: 'weekly' },
  { url: '/prix-assurance-taxi', priority: '0.8', changefreq: 'weekly' },
  { url: '/quelle-assurance-taxi', priority: '0.8', changefreq: 'weekly' },
  { url: '/courtier-assurance-taxi', priority: '0.8', changefreq: 'weekly' },
  { url: '/assurance-taxi-solly-azar', priority: '0.8', changefreq: 'weekly' },
  { url: '/rc-professionnelle', priority: '0.7', changefreq: 'monthly' },
  { url: '/flotte-vehicules', priority: '0.7', changefreq: 'monthly' },
  { url: '/gestion-sinistres', priority: '0.7', changefreq: 'monthly' },
  { url: '/taxis-sinistres', priority: '0.7', changefreq: 'monthly' },
  { url: '/confiance-et-certifications', priority: '0.6', changefreq: 'monthly' },
  { url: '/conseil-personnalise', priority: '0.6', changefreq: 'monthly' },
  { url: '/faq', priority: '0.7', changefreq: 'weekly' },
  { url: '/contact', priority: '0.7', changefreq: 'monthly' },
  { url: '/blog', priority: '0.8', changefreq: 'daily' },
  { url: '/actualites', priority: '0.7', changefreq: 'daily' },
  { url: '/villes', priority: '0.7', changefreq: 'weekly' },
  { url: '/reviews', priority: '0.6', changefreq: 'weekly' },
  { url: '/programme-partenaires', priority: '0.5', changefreq: 'monthly' },
  { url: '/newsletter', priority: '0.4', changefreq: 'monthly' },
  { url: '/sitemap', priority: '0.4', changefreq: 'monthly' },
  { url: '/legal', priority: '0.3', changefreq: 'yearly' },
  { url: '/policy', priority: '0.3', changefreq: 'yearly' },
  { url: '/conditions', priority: '0.3', changefreq: 'yearly' },
];

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const CITY_UUID_SLUG_RE = new RegExp(`^(assurance-taxi-)?ville-${UUID_PATTERN}$`, 'i');
const TIMESTAMPED_SLUG_RE = /-\d{10,}(?:\.\d+)?$/;
const CITY_MONEY_DOORWAY_RE = /^(assurance-taxi-)?pas-cher(?:e)?-/i;
const BROKEN_SLUG_PATTERNS = [
  /\s/,
  /%20/i,
  /(?:^|-)r-(?:glement|gulations|vision|cents|siliation|duire)/i,
  /(?:^|-)n-mes(?:-|$)/i,
  /(?:^|-)mont-vrain(?:-|$)/i,
  /(?:^|-)bar-ul(?:-|$)/i,
  /(?:^|-)bi-re(?:-|$)/i,
  /(?:^|-)crit-res(?:-|$)/i,
  /(?:^|-)m-e-sur(?:-|$)/i,
];

function getPublicSourceOrder() {
  const configured = String(process.env.PUBLIC_SITEMAP_SOURCE_ORDER || process.env.VITE_PUBLIC_CONTENT_SOURCE_ORDER || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .map((value) => {
      if (['postgres', 'postgres-public', 'postgres_public', 'pg'].includes(value)) return 'postgres-public';
      if (['d1', 'cloudflare-d1', 'cloudflare_d1'].includes(value)) return 'd1';
      return null;
    })
    .filter(Boolean);

  const seen = new Set();
  const order = [];
  for (const source of configured.length ? configured : DEFAULT_SOURCE_ORDER) {
    if (!seen.has(source)) {
      seen.add(source);
      order.push(source);
    }
  }
  return order;
}

function toIsoDate(value) {
  if (!value) return new Date().toISOString().split('T')[0];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
  return date.toISOString().split('T')[0];
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function escapeXml(value) {
  return encodeURI(value)
    .replace(/[^\x00-\x7F]/g, (char) => encodeURIComponent(char))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hasBrokenSlugEncoding(slug) {
  const value = String(slug || '').trim();
  return BROKEN_SLUG_PATTERNS.some((pattern) => pattern.test(value));
}

function isIndexableContentSlug(slug) {
  const value = String(slug || '').trim();
  if (!value) return false;
  if (hasBrokenSlugEncoding(value)) return false;
  if (TIMESTAMPED_SLUG_RE.test(value)) return false;
  return true;
}

function isIndexableCitySlug(slug) {
  const value = String(slug || '').trim();
  if (!value) return false;
  if (CITY_UUID_SLUG_RE.test(value)) return false;
  if (hasBrokenSlugEncoding(value)) return false;
  if (CITY_MONEY_DOORWAY_RE.test(value)) return false;
  return true;
}

function isPublicSitemapLoc(loc) {
  try {
    const url = new URL(loc);
    if (`${url.protocol}//${url.host}` !== SITE_URL) return false;
    if (url.search) return false;
    if (url.pathname.includes('/m/')) return false;
    if (url.pathname.includes('/ville/')) return false;
    if (/^\/(?:admin|backoffice|api|espace-client|espace-prospect)(?:\/|$)/i.test(url.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function toCityPath(slug) {
  return slug.startsWith('assurance-taxi-') ? `/${slug}` : `/assurance-taxi-${slug}`;
}

function normalizeLoc(pathOrUrl) {
  const loc = pathOrUrl.startsWith('http') ? pathOrUrl : `${SITE_URL}${pathOrUrl}`;
  return decodeXml(loc).replace(/\/$/, loc === `${SITE_URL}/` ? '/' : '');
}

function upsertUrl(urlsByLoc, pathOrUrl, lastmod, changefreq, priority) {
  const loc = normalizeLoc(pathOrUrl);
  if (!isPublicSitemapLoc(loc)) return;
  urlsByLoc.set(loc, {
    loc,
    lastmod: toIsoDate(lastmod),
    changefreq,
    priority,
  });
}

function payloadFor(row) {
  if (row?.payload && typeof row.payload === 'object') return row.payload;
  return row || {};
}

function field(row, key) {
  const payload = payloadFor(row);
  return row?.[key] || payload?.[key] || null;
}

function parseExistingSitemap(xml) {
  const urls = [];
  const blocks = [...String(xml || '').matchAll(/<url>\s*([\s\S]*?)<\/url>/g)];
  for (const block of blocks) {
    const body = block[1];
    const loc = decodeXml((body.match(/<loc>([\s\S]*?)<\/loc>/) || [])[1] || '');
    if (!loc || !isPublicSitemapLoc(loc)) continue;
    urls.push({
      loc,
      lastmod: (body.match(/<lastmod>([\s\S]*?)<\/lastmod>/) || [])[1] || null,
      changefreq: (body.match(/<changefreq>([\s\S]*?)<\/changefreq>/) || [])[1] || 'monthly',
      priority: (body.match(/<priority>([\s\S]*?)<\/priority>/) || [])[1] || '0.5',
    });
  }
  return urls;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'cache-control': 'no-cache',
        'user-agent': 'TaxiAssurSitemapGenerator/1.0',
      },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, status: response.status, items: [] };
    const json = await response.json();
    return { ok: json?.ok === true, status: response.status, items: Array.isArray(json?.items) ? json.items : [] };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error), items: [] };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPublicRows(table, options = {}) {
  const order = getPublicSourceOrder();
  for (const source of order) {
    const endpoint = SOURCE_ENDPOINTS[source];
    const url = new URL(`${SITE_URL}${endpoint}/list`);
    url.searchParams.set('table', table);
    url.searchParams.set('limit', String(PUBLIC_LIST_LIMIT));
    url.searchParams.set('status', 'published');
    if (options.sort) url.searchParams.set('sort', options.sort);

    const result = await fetchJson(url.toString());
    if (result.ok && result.items.length > 0) {
      console.log(`Loaded ${result.items.length} ${table} rows from ${source}`);
      return result.items;
    }
    console.log(`Warning: ${table} unavailable from ${source} (status ${result.status}${result.error ? `, ${result.error}` : ''})`);
  }
  return [];
}

function readExistingLocalSitemap() {
  const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) return [];
  return parseExistingSitemap(fs.readFileSync(sitemapPath, 'utf8'));
}

async function generateSitemap() {
  console.log('Generating autonomous sitemap from public PostgreSQL/D1 sources...');

  const urlsByLoc = new Map();
  const today = new Date().toISOString();
  const existingUrls = readExistingLocalSitemap();

  for (const item of existingUrls) {
    upsertUrl(urlsByLoc, item.loc, item.lastmod || today, item.changefreq || 'monthly', item.priority || '0.5');
  }

  for (const page of staticPages) {
    upsertUrl(urlsByLoc, page.url, today, page.changefreq, page.priority);
  }

  const [cityPages, blogPosts, newsArticles] = await Promise.all([
    fetchPublicRows('city_pages', { sort: 'updated_at' }),
    fetchPublicRows('blog_posts', { sort: 'updated_at' }),
    fetchPublicRows('news_articles', { sort: 'published_at' }),
  ]);

  for (const row of cityPages) {
    const slug = String(field(row, 'slug') || '').trim();
    if (!isIndexableCitySlug(slug)) continue;
    upsertUrl(urlsByLoc, toCityPath(slug), field(row, 'updated_at') || field(row, 'published_at') || field(row, 'created_at'), 'weekly', '0.7');
  }

  for (const row of blogPosts) {
    const slug = String(field(row, 'slug') || '').trim();
    if (!isIndexableContentSlug(slug)) continue;
    upsertUrl(urlsByLoc, `/blog/${slug}`, field(row, 'updated_at') || field(row, 'published_at') || field(row, 'created_at'), 'monthly', '0.6');
  }

  for (const row of newsArticles) {
    const slug = String(field(row, 'slug') || '').trim();
    if (!isIndexableContentSlug(slug)) continue;
    upsertUrl(urlsByLoc, `/actualites/${slug}`, field(row, 'updated_at') || field(row, 'published_at') || field(row, 'created_at'), 'monthly', '0.5');
  }

  const urls = Array.from(urlsByLoc.values()).sort((a, b) => {
    if (a.loc === `${SITE_URL}/`) return -1;
    if (b.loc === `${SITE_URL}/`) return 1;
    return a.loc.localeCompare(b.loc);
  });

  if (urls.length < MIN_SITEMAP_URLS) {
    throw new Error(`Sitemap would contain only ${urls.length} URLs, below minimum ${MIN_SITEMAP_URLS}. Existing sitemap was left unchanged.`);
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const url of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';

  const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');

  console.log(`Sitemap generated: ${sitemapPath}`);
  console.log(`Total URLs: ${urls.length}`);
  console.log(`Existing sitemap URLs preserved: ${existingUrls.length}`);
  console.log(`Static pages: ${staticPages.length}`);
  console.log(`Latest city pages refreshed: ${cityPages.length}`);
  console.log(`Latest blog posts refreshed: ${blogPosts.length}`);
  console.log(`Latest news articles refreshed: ${newsArticles.length}`);

  return urls;
}

generateSitemap()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Sitemap generation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });