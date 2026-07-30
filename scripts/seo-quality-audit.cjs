#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const REPORT_PATH = path.resolve(ROOT, process.env.SEO_QUALITY_REPORT || 'reports/seo-quality-audit.json');

const BROKEN_SLUG_PATTERNS = [
  { name: 'encoded space', pattern: /%20/i },
  { name: 'raw whitespace', pattern: /\s/ },
  { name: 'broken accent r-*', pattern: /(?:^|-)r-(?:glement|gulations|vision|cents|siliation|duire)/i },
  { name: 'broken nimes', pattern: /(?:^|-)n-mes(?:-|$)/i },
  { name: 'broken montevraint', pattern: /(?:^|-)mont-vrain(?:-|$)/i },
  { name: 'broken baroeul', pattern: /(?:^|-)bar-ul(?:-|$)/i },
  { name: 'broken biere', pattern: /(?:^|-)bi-re(?:-|$)/i },
  { name: 'broken criteres', pattern: /(?:^|-)crit-res(?:-|$)/i },
  { name: 'broken mee-sur', pattern: /(?:^|-)m-e-sur(?:-|$)/i },
];

const MAX_URL_LENGTH = 180;
const MAX_PATH_LENGTH = 140;
const MAX_SITEMAP_URLS = 50000;

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function extractLocs(sitemap) {
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function pathnameOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

function slugOf(url) {
  const pathname = pathnameOf(url);
  return decodeURIComponent(pathname.split('/').pop() || pathname).toLowerCase();
}

function categoryOf(url) {
  const pathname = pathnameOf(url);
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/blog/')) return 'blog';
  if (pathname.startsWith('/actualites/')) return 'news';
  if (pathname.startsWith('/assurance-taxi-')) return 'city_or_service';
  return pathname.split('/')[1] || 'static';
}

function findBrokenSlug(url) {
  const slug = slugOf(url);
  return BROKEN_SLUG_PATTERNS.filter((entry) => entry.pattern.test(slug)).map((entry) => entry.name);
}

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(record, limit = 12) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function addIssue(list, severity, code, message, details = {}) {
  list.push({ severity, code, message, details });
}

function audit() {
  const sitemap = read('public/sitemap.xml');
  const robots = read('public/robots.txt');
  const middleware = read('functions/_middleware.js');
  const locs = extractLocs(sitemap);
  const issues = [];
  const warnings = [];

  const duplicates = locs.filter((url, index) => locs.indexOf(url) !== index);
  if (duplicates.length) {
    addIssue(issues, 'error', 'duplicate_urls', 'Duplicate URLs found in sitemap.', { count: duplicates.length, sample: duplicates.slice(0, 20) });
  }

  if (locs.length > MAX_SITEMAP_URLS) {
    addIssue(issues, 'error', 'sitemap_too_large', 'Sitemap exceeds Google URL limit.', { count: locs.length, limit: MAX_SITEMAP_URLS });
  }

  const nonCanonicalHost = locs.filter((url) => !(url === `${SITE_URL}/` || url.startsWith(`${SITE_URL}/`)));
  if (nonCanonicalHost.length) {
    addIssue(issues, 'error', 'non_canonical_host', 'Sitemap contains URLs outside the canonical apex host.', { sample: nonCanonicalHost.slice(0, 20) });
  }

  const blockedByRobots = locs.filter((url) => {
    const pathname = pathnameOf(url);
    return pathname.startsWith('/backoffice') || pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname.startsWith('/client') || pathname.startsWith('/espace-client') || pathname.startsWith('/espace-prospect') || pathname.startsWith('/paiement') || pathname.startsWith('/m/') || pathname.startsWith('/ville/');
  });
  if (blockedByRobots.length) {
    addIssue(issues, 'error', 'blocked_urls_in_sitemap', 'Sitemap contains URLs that should be private, duplicate, or blocked.', { sample: blockedByRobots.slice(0, 20) });
  }

  const broken = locs
    .map((url) => ({ url, reasons: findBrokenSlug(url) }))
    .filter((row) => row.reasons.length > 0);
  if (broken.length) {
    addIssue(issues, 'error', 'broken_slug_urls', 'Sitemap contains broken generated slugs that should not be promoted to crawlers.', { count: broken.length, sample: broken.slice(0, 30) });
  }

  const tooLong = locs.filter((url) => url.length > MAX_URL_LENGTH || pathnameOf(url).length > MAX_PATH_LENGTH);
  if (tooLong.length) {
    addIssue(warnings, 'warning', 'long_urls', 'Long URLs should be reviewed for readability and SERP quality.', { count: tooLong.length, sample: tooLong.slice(0, 20) });
  }

  const timestamped = locs.filter((url) => /-\d{10,}(?:\.\d+)?(?:\/)?$/i.test(pathnameOf(url)));
  if (timestamped.length) {
    addIssue(warnings, 'warning', 'timestamped_slugs', 'Timestamp-like suffixes can look automatically generated; review content quality and canonicals.', { count: timestamped.length, sample: timestamped.slice(0, 20) });
  }

  const repeatedCheapTaxi = locs.filter((url) => pathnameOf(url).includes('assurance-taxi-pas-cher'));
  if (repeatedCheapTaxi.length > 20) {
    addIssue(warnings, 'warning', 'repeated_money_keyword_cluster', 'Large pas-cher URL cluster should be reviewed for doorway/scaled-content risk.', { count: repeatedCheapTaxi.length, sample: repeatedCheapTaxi.slice(0, 20) });
  }

  if (/^\s*Disallow:\s*\/villes\/?\s*$/m.test(robots)) {
    addIssue(issues, 'error', 'city_index_blocked', '/villes is blocked in robots.txt but should be indexable.', {});
  }

  if (!middleware.includes('HTMLRewriter') || !middleware.includes('taxiassur:seo-edge')) {
    addIssue(issues, 'error', 'missing_edge_seo', 'Cloudflare edge SEO metadata injection is missing.', {});
  }

  const categories = countBy(locs, categoryOf);
  const report = {
    ok: issues.length === 0,
    checked_at: new Date().toISOString(),
    site_url: SITE_URL,
    totals: {
      urls: locs.length,
      categories,
      warnings: warnings.length,
      errors: issues.length,
    },
    top_categories: topEntries(categories),
    issues,
    warnings,
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(report, null, 2));
  console.log(`SEO quality report written to ${path.relative(ROOT, REPORT_PATH)}`);

  if (!report.ok) process.exit(1);
}

audit();