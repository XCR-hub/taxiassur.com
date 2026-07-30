import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SITE_URL = 'https://taxiassur.com';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log('Sitemap generation skipped: Supabase environment is not configured locally.');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

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

function toIsoDate(value) {
  if (!value) return new Date().toISOString().split('T')[0];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
  return date.toISOString().split('T')[0];
}

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

function toCityPath(slug) {
  return slug.startsWith('assurance-taxi-') ? `/${slug}` : `/assurance-taxi-${slug}`;
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

function addUrl(urls, seen, pathOrUrl, lastmod, changefreq, priority) {
  const loc = pathOrUrl.startsWith('http') ? pathOrUrl : `${SITE_URL}${pathOrUrl}`;
  if (seen.has(loc)) return;
  seen.add(loc);
  urls.push({ loc, lastmod: toIsoDate(lastmod), changefreq, priority });
}

async function fetchRows(label, query) {
  const { data, error } = await query;
  if (error) {
    console.log(`Warning: ${label} skipped: ${error.message}`);
    return [];
  }
  return data || [];
}

async function generateSitemap() {
  console.log('Generating sitemap...');

  const urls = [];
  const seen = new Set();
  const today = new Date().toISOString();

  for (const page of staticPages) {
    addUrl(urls, seen, page.url, today, page.changefreq, page.priority);
  }

  const cityPages = await fetchRows(
    'city pages',
    supabase
      .from('city_pages')
      .select('slug, updated_at, created_at, published_at')
      .or('status.eq.published,published.eq.true,is_published.eq.true')
      .order('updated_at', { ascending: false })
      .limit(5000)
  );

  for (const page of cityPages) {
    if (!isIndexableCitySlug(page.slug)) continue;
    addUrl(urls, seen, toCityPath(page.slug), page.updated_at || page.published_at || page.created_at, 'weekly', '0.7');
  }

  const blogPosts = await fetchRows(
    'blog posts',
    supabase
      .from('blog_posts')
      .select('slug, updated_at, created_at')
      .eq('published', true)
      .order('updated_at', { ascending: false })
      .limit(5000)
  );

  for (const post of blogPosts) {
    if (!isIndexableContentSlug(post.slug)) continue;
    addUrl(urls, seen, `/blog/${post.slug}`, post.updated_at || post.created_at, 'monthly', '0.6');
  }

  const newsArticles = await fetchRows(
    'news articles',
    supabase
      .from('news_articles')
      .select('slug, updated_at, published_at, created_at')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(5000)
  );

  for (const article of newsArticles) {
    if (!isIndexableContentSlug(article.slug)) continue;
    addUrl(urls, seen, `/actualites/${article.slug}`, article.updated_at || article.published_at || article.created_at, 'monthly', '0.5');
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

  const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');

  console.log(`Sitemap generated: ${sitemapPath}`);
  console.log(`Total URLs: ${urls.length}`);
  console.log(`Static pages: ${staticPages.length}`);
  console.log(`City pages: ${cityPages.length}`);
  console.log(`Blog posts: ${blogPosts.length}`);
  console.log(`News articles: ${newsArticles.length}`);

  return urls;
}

generateSitemap()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Sitemap generation failed:', error);
    process.exit(1);
  });
