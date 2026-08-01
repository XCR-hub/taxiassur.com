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
const PUBLIC_LIST_LIMIT = Math.max(1, Math.min(250, Number(process.env.PUBLIC_SITEMAP_LIST_LIMIT || 250)));
const PUBLIC_LIST_MAX_PAGES = Math.max(1, Math.min(100, Number(process.env.PUBLIC_SITEMAP_MAX_PAGES || 30)));
const FETCH_TIMEOUT_MS = Math.max(1500, Math.min(15000, Number(process.env.PUBLIC_SITEMAP_FETCH_TIMEOUT_MS || 8000)));
const DEFAULT_SOURCE_ORDER = ['postgres-public', 'd1'];
const SOURCE_ENDPOINTS = {
  'postgres-public': '/api/postgres-public',
  d1: '/api/d1',
};

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out') {
      parsed.out = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--out=')) {
      parsed.out = arg.slice('--out='.length);
    } else if (arg === '--baseline') {
      parsed.baseline = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--baseline=')) {
      parsed.baseline = arg.slice('--baseline='.length);
    } else if (arg === '--seo-map') {
      parsed.seoMap = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--seo-map=')) {
      parsed.seoMap = arg.slice('--seo-map='.length);
    }
  }
  return parsed;
}

function resolveProjectPath(value, fallback) {
  return path.resolve(rootDir, value || fallback);
}

const cliArgs = parseArgs(process.argv.slice(2));
const BASELINE_SITEMAP_PATH = resolveProjectPath(cliArgs.baseline, path.join('public', 'sitemap.xml'));
const OUTPUT_SITEMAP_PATH = resolveProjectPath(cliArgs.out, path.join('public', 'sitemap.xml'));
const OUTPUT_SEO_MAP_PATH = resolveProjectPath(
  cliArgs.seoMap,
  path.join(path.dirname(OUTPUT_SITEMAP_PATH), 'seo-content-map.json'),
);

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

function decodePercentValue(value) {
  let current = String(value || '').trim();
  for (let index = 0; index < 6; index += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) return current.normalize('NFC');
      current = decoded;
    } catch {
      return current.normalize('NFC');
    }
  }
  return current.normalize('NFC');
}

function cleanSlugValue(value) {
  return decodePercentValue(value).replace(/^\/+|\/+$/g, '');
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

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value, maxLength) {
  const text = stripHtml(value);
  if (!text || text.length <= maxLength) return text;
  const cut = text.slice(0, Math.max(1, maxLength - 3)).replace(/\s+\S*$/, '').trim();
  return `${cut || text.slice(0, maxLength - 3)}...`;
}

function cleanTitle(value, fallback) {
  return compactText(value, 85) || fallback;
}

function withBrandSuffix(title, suffix) {
  if (/TaxiAssur/i.test(title)) return title;
  return `${title} | ${suffix}`;
}

function descriptionFor(row, fallback) {
  const primary = compactText(
    field(row, 'meta_description') || field(row, 'excerpt') || field(row, 'description') || field(row, 'content'),
    170,
  );
  if (primary.length >= 50) return primary;
  return compactText(fallback, 170);
}

function addSeoMapEntry(map, route, entry) {
  if (!route || !route.startsWith('/')) return;
  const title = cleanTitle(entry.title, 'TaxiAssur');
  const description = compactText(entry.description, 170);
  if (!title || !description) return;

  map[route] = {
    title,
    description,
    section: entry.section || 'TaxiAssur',
    priority: entry.priority || 'content',
    ...(entry.city ? { city: entry.city } : {}),
    ...(entry.updated_at ? { updated_at: entry.updated_at } : {}),
  };
}

function hasBrokenSlugEncoding(slug) {
  const value = cleanSlugValue(slug);
  return /%[0-9a-f]{2}/i.test(value) || BROKEN_SLUG_PATTERNS.some((pattern) => pattern.test(value));
}

function isIndexableContentSlug(slug) {
  const value = cleanSlugValue(slug);
  if (!value) return false;
  if (hasBrokenSlugEncoding(value)) return false;
  if (TIMESTAMPED_SLUG_RE.test(value)) return false;
  return true;
}

function isIndexableCitySlug(slug) {
  const value = cleanSlugValue(slug);
  if (!value) return false;
  if (CITY_UUID_SLUG_RE.test(value)) return false;
  if (hasBrokenSlugEncoding(value)) return false;
  if (CITY_MONEY_DOORWAY_RE.test(value)) return false;
  return true;
}

function isPublicSitemapLoc(loc) {
  try {
    const url = new URL(decodeXml(loc), SITE_URL);
    if (`${url.protocol}//${url.host}` !== SITE_URL) return false;
    if (url.search) return false;
    const pathname = decodePercentValue(url.pathname);
    if (/%25/i.test(url.pathname)) return false;
    if (pathname.includes('/m/')) return false;
    if (pathname.includes('/ville/')) return false;
    if (/^\/(?:admin|backoffice|api|espace-client|espace-prospect)(?:\/|$)/i.test(pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function toCityPath(slug) {
  const value = cleanSlugValue(slug);
  return value.startsWith('assurance-taxi-') ? `/${value}` : `/assurance-taxi-${value}`;
}

function normalizeLoc(pathOrUrl) {
  const raw = decodeXml(pathOrUrl.startsWith('http') ? pathOrUrl : `${SITE_URL}${pathOrUrl}`);
  const url = new URL(raw, SITE_URL);
  const pathname = decodePercentValue(url.pathname);
  const canonicalPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  return `${SITE_URL}${canonicalPath}`;
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

function itemKey(item) {
  const payload = payloadFor(item);
  return String(
    item?.source_id ||
    item?.id ||
    item?.slug ||
    payload?.id ||
    payload?.slug ||
    JSON.stringify(item).slice(0, 250),
  );
}

async function fetchPublicRowsFromSource(table, source, options = {}) {
  const endpoint = SOURCE_ENDPOINTS[source];
  const items = [];
  const seen = new Set();
  let lastStatus = 0;
  let lastError = '';

  for (let page = 0; page < PUBLIC_LIST_MAX_PAGES; page += 1) {
    const offset = page * PUBLIC_LIST_LIMIT;
    const url = new URL(`${SITE_URL}${endpoint}/list`);
    url.searchParams.set('table', table);
    url.searchParams.set('limit', String(PUBLIC_LIST_LIMIT));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('status', 'published');
    if (options.sort) url.searchParams.set('sort', options.sort);

    const result = await fetchJson(url.toString());
    lastStatus = result.status;
    lastError = result.error || '';
    if (!result.ok) return { ok: false, status: lastStatus, error: lastError, items };
    if (result.items.length === 0) break;

    let added = 0;
    for (const item of result.items) {
      const key = itemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
      added += 1;
    }

    if (added === 0) break;
    if (result.items.length < PUBLIC_LIST_LIMIT) break;
  }

  return { ok: true, status: lastStatus || 200, error: lastError, items };
}

async function fetchPublicRows(table, options = {}) {
  const order = getPublicSourceOrder();
  for (const source of order) {
    const result = await fetchPublicRowsFromSource(table, source, options);
    if (result.ok && result.items.length > 0) {
      console.log(`Loaded ${result.items.length} ${table} rows from ${source}`);
      return result.items;
    }
    console.log(`Warning: ${table} unavailable from ${source} (status ${result.status}${result.error ? `, ${result.error}` : ''})`);
  }
  return [];
}

function readExistingLocalSitemap() {
  if (!fs.existsSync(BASELINE_SITEMAP_PATH)) return [];
  return parseExistingSitemap(fs.readFileSync(BASELINE_SITEMAP_PATH, 'utf8'));
}

function buildSeoContentMap(cityPages, blogPosts, newsArticles) {
  const routes = {};

  for (const row of cityPages) {
    const slug = cleanSlugValue(field(row, 'slug'));
    if (!isIndexableCitySlug(slug)) continue;
    const city = field(row, 'city_name') || field(row, 'city') || field(row, 'name') || slug.replace(/^assurance-taxi-/, '').replace(/-/g, ' ');
    const route = toCityPath(slug);
    addSeoMapEntry(routes, route, {
      title: field(row, 'meta_title') || field(row, 'title') || `Assurance taxi ${city} - Devis professionnel | TaxiAssur`,
      description: descriptionFor(row, `Comparez votre assurance taxi a ${city} avec TaxiAssur : garanties professionnelles, devis, documents et accompagnement courtier.`),
      section: `Assurance taxi ${city}`,
      priority: 'local',
      city,
      updated_at: field(row, 'updated_at') || field(row, 'published_at') || field(row, 'created_at'),
    });
  }

  for (const row of blogPosts) {
    const slug = cleanSlugValue(field(row, 'slug'));
    if (!isIndexableContentSlug(slug)) continue;
    const title = cleanTitle(field(row, 'title'), 'Article assurance taxi');
    addSeoMapEntry(routes, `/blog/${slug}`, {
      title: withBrandSuffix(title, 'Blog TaxiAssur'),
      description: descriptionFor(row, 'Guide TaxiAssur pour chauffeurs de taxi : assurance professionnelle, garanties, sinistres, tarifs et bonnes pratiques.'),
      section: 'Blog',
      priority: 'content',
      updated_at: field(row, 'updated_at') || field(row, 'published_at') || field(row, 'created_at'),
    });
  }

  for (const row of newsArticles) {
    const slug = cleanSlugValue(field(row, 'slug'));
    if (!isIndexableContentSlug(slug)) continue;
    const title = cleanTitle(field(row, 'title'), 'Actualite assurance taxi');
    addSeoMapEntry(routes, `/actualites/${slug}`, {
      title: withBrandSuffix(title, 'Actualites TaxiAssur'),
      description: descriptionFor(row, 'Actualite TaxiAssur utile aux chauffeurs de taxi : assurance professionnelle, reglementation, mobilite et gestion des risques.'),
      section: 'Actualites',
      priority: 'content',
      updated_at: field(row, 'updated_at') || field(row, 'published_at') || field(row, 'created_at'),
    });
  }

  return Object.fromEntries(Object.entries(routes).sort(([a], [b]) => a.localeCompare(b)));
}

function writeSeoContentMap(routes) {
  fs.mkdirSync(path.dirname(OUTPUT_SEO_MAP_PATH), { recursive: true });
  fs.writeFileSync(
    OUTPUT_SEO_MAP_PATH,
    `${JSON.stringify({ generated_at: new Date().toISOString(), routes }, null, 2)}\n`,
    'utf8',
  );
  console.log(`SEO content map generated: ${OUTPUT_SEO_MAP_PATH}`);
  console.log(`SEO content map routes: ${Object.keys(routes).length}`);
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
    const slug = cleanSlugValue(field(row, 'slug'));
    if (!isIndexableCitySlug(slug)) continue;
    upsertUrl(urlsByLoc, toCityPath(slug), field(row, 'updated_at') || field(row, 'published_at') || field(row, 'created_at'), 'weekly', '0.7');
  }

  for (const row of blogPosts) {
    const slug = cleanSlugValue(field(row, 'slug'));
    if (!isIndexableContentSlug(slug)) continue;
    upsertUrl(urlsByLoc, `/blog/${slug}`, field(row, 'updated_at') || field(row, 'published_at') || field(row, 'created_at'), 'monthly', '0.6');
  }

  for (const row of newsArticles) {
    const slug = cleanSlugValue(field(row, 'slug'));
    if (!isIndexableContentSlug(slug)) continue;
    upsertUrl(urlsByLoc, `/actualites/${slug}`, field(row, 'updated_at') || field(row, 'published_at') || field(row, 'created_at'), 'monthly', '0.5');
  }

  const seoContentMap = buildSeoContentMap(cityPages, blogPosts, newsArticles);

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

  fs.mkdirSync(path.dirname(OUTPUT_SITEMAP_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_SITEMAP_PATH, xml, 'utf8');
  writeSeoContentMap(seoContentMap);

  console.log(`Sitemap generated: ${OUTPUT_SITEMAP_PATH}`);
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