#!/usr/bin/env node

const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const REPORT_PATH = process.env.PUBLICATION_HEALTH_REPORT || 'reports/publication-automation-health.json';
const COUNT_TOLERANCE = Math.max(0, Number(process.env.PUBLIC_MIRROR_COUNT_TOLERANCE || 0));

const REQUIRED_COUNTS = {
  blog_posts: 100,
  city_pages: 100,
  faq_entries: 50,
  news_articles: 500,
  gsc_pages: 100,
  gsc_queries: 100,
};

const FRESHNESS_DAYS = {
  blog_posts: 7,
  news_articles: 7,
  city_pages: 45,
  faq_entries: 90,
};

const CONTENT_TABLES = ['blog_posts', 'news_articles', 'city_pages', 'faq_entries'];
const CORE_ROUTES = ['/blog', '/actualites', '/villes', '/faq', '/assurance-taxi', '/devis-assurance-taxi'];

const checks = [];
const warnings = [];

function addCheck(name, ok, details = {}) {
  checks.push({ name, ok: Boolean(ok), details });
}

function addWarning(name, details = {}) {
  warnings.push({ name, details });
}

async function fetchText(label, url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'user-agent': 'TaxiAssurPublicationHealth/1.0',
        ...(options.headers || {}),
      },
    });
    return { label, ok: response.ok, status: response.status, text: await response.text() };
  } catch (error) {
    return { label, ok: false, status: 0, error: error.message, text: '' };
  }
}

async function fetchJson(label, url, options = {}) {
  const result = await fetchText(label, url, options);
  try {
    return { ...result, json: result.text ? JSON.parse(result.text) : null };
  } catch (error) {
    return { ...result, ok: false, json: null, parse_error: error.message };
  }
}

function rowsFromD1Health(json) {
  const out = {};
  for (const row of json?.counts?.public_content_cache || []) {
    out[row.source_table] = Number(row.rows || 0);
  }
  for (const row of json?.counts?.gsc_metrics_cache || []) {
    out[row.source_table] = Number(row.rows || 0);
  }
  return out;
}

function rowsFromPostgresHealth(json) {
  const out = {};
  const tables = json?.tables || {};
  for (const table of Object.keys(REQUIRED_COUNTS)) {
    out[table] = Number(tables[table] || 0);
  }
  return out;
}

function itemPayload(item) {
  return item?.payload && typeof item.payload === 'object' ? item.payload : item || {};
}

function itemUrl(table, item) {
  const payload = itemPayload(item);
  if (item?.url) return item.url;
  if (payload.url) return payload.url;
  const slug = item?.slug || payload.slug;
  if (!slug) return null;
  if (table === 'blog_posts') return `/blog/${slug}`;
  if (table === 'news_articles') return `/actualites/${slug}`;
  if (table === 'city_pages') return `/${slug}`;
  if (table === 'faq_entries') return '/faq';
  return null;
}

function latestDateForItem(item) {
  const payload = itemPayload(item);
  const raw = item?.updated_at || item?.published_at || payload.updated_at || payload.published_at || payload.created_at || item?.created_at;
  const date = raw ? new Date(raw) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function ageDays(date) {
  return (Date.now() - date.getTime()) / 86400000;
}

function normalizePath(pathOrUrl) {
  if (!pathOrUrl) return null;
  try {
    return new URL(pathOrUrl, SITE_URL).pathname;
  } catch {
    return null;
  }
}

async function verifyListSource(source, table) {
  const result = await fetchJson(`${source}-${table}`, `${SITE_URL}/api/${source}/list?table=${table}&limit=5&status=published&ts=${Date.now()}`);
  const items = Array.isArray(result.json?.items) ? result.json.items : [];
  addCheck(`${source} ${table} returns published items`, result.ok && result.json?.ok === true && items.length > 0, {
    status: result.status,
    items: items.length,
  });

  if (!items.length) return null;
  const latest = items[0];
  const date = latestDateForItem(latest);
  if (date) {
    const maxAge = FRESHNESS_DAYS[table];
    const days = ageDays(date);
    if (maxAge && days > maxAge) {
      addWarning(`${table} latest ${source} item is older than expected`, {
        source,
        days: Number(days.toFixed(1)),
        max_days: maxAge,
        date: date.toISOString(),
      });
    }
  } else {
    addWarning(`${table} latest ${source} item has no usable date`, { source });
  }

  return latest;
}

async function main() {
  const checkedAt = new Date().toISOString();

  const [d1Health, postgresHealth, sitemap, robots] = await Promise.all([
    fetchJson('d1-health', `${SITE_URL}/api/d1/health?ts=${Date.now()}`),
    fetchJson('postgres-health', `${SITE_URL}/api/postgres-public/health?ts=${Date.now()}`),
    fetchText('sitemap', `${SITE_URL}/sitemap.xml?ts=${Date.now()}`),
    fetchText('robots', `${SITE_URL}/robots.txt?ts=${Date.now()}`),
  ]);

  addCheck('D1 public cache health is OK', d1Health.ok && d1Health.json?.ok === true, { status: d1Health.status });
  addCheck('PostgreSQL public mirror health is OK', postgresHealth.ok && postgresHealth.json?.ok === true, { status: postgresHealth.status });
  addCheck('sitemap.xml is reachable', sitemap.ok && sitemap.text.includes('<urlset'), { status: sitemap.status });
  addCheck('robots.txt is reachable and exposes sitemap', robots.ok && /Sitemap:\s*https:\/\/taxiassur\.com\/sitemap\.xml/i.test(robots.text), { status: robots.status });

  const d1Counts = rowsFromD1Health(d1Health.json);
  const pgCounts = rowsFromPostgresHealth(postgresHealth.json);
  const countComparisons = Object.keys(REQUIRED_COUNTS).map((table) => {
    const d1Rows = d1Counts[table] || 0;
    const postgresRows = pgCounts[table] || 0;
    const difference = Math.abs(d1Rows - postgresRows);

    return {
      table,
      d1: d1Rows,
      postgres: postgresRows,
      min: REQUIRED_COUNTS[table],
      difference,
      tolerance: COUNT_TOLERANCE,
      equal: d1Rows === postgresRows,
      within_tolerance: difference <= COUNT_TOLERANCE,
      enough: d1Rows >= REQUIRED_COUNTS[table] && postgresRows >= REQUIRED_COUNTS[table],
    };
  });

  for (const row of countComparisons) {
    addCheck(`${row.table} public volume is sufficient`, row.enough, row);
    addCheck(`${row.table} D1/PostgreSQL counts are within tolerance`, row.within_tolerance, row);
    if (!row.equal && row.within_tolerance) {
      addWarning(`${row.table} D1/PostgreSQL counts differ within tolerance`, row);
    }
  }

  const locs = Array.from(sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)).map((match) => match[1]);
  addCheck('sitemap contains at least 800 URLs', locs.length >= 800, { urls: locs.length });
  addCheck('sitemap includes blog URLs', locs.some((url) => url.includes('/blog/')), { sample: locs.find((url) => url.includes('/blog/')) || null });
  addCheck('sitemap includes news URLs', locs.some((url) => url.includes('/actualites/')), { sample: locs.find((url) => url.includes('/actualites/')) || null });
  addCheck('sitemap includes city URLs', locs.some((url) => /\/assurance-taxi-[a-z0-9-]+$/.test(url)), { sample: locs.find((url) => /\/assurance-taxi-[a-z0-9-]+$/.test(url)) || null });
  addCheck('sitemap includes FAQ index', locs.includes(`${SITE_URL}/faq`), {});

  const latestRoutes = new Set(CORE_ROUTES);
  for (const table of CONTENT_TABLES) {
    const [d1Item, pgItem] = await Promise.all([
      verifyListSource('d1', table),
      verifyListSource('postgres-public', table),
    ]);
    for (const item of [d1Item, pgItem]) {
      const route = normalizePath(itemUrl(table, item));
      if (route) latestRoutes.add(route);
    }
  }

  const routeResults = await Promise.all(
    Array.from(latestRoutes).map((route) => fetchText(`route-${route}`, `${SITE_URL}${route}?publication-health=${Date.now()}`)),
  );

  for (const result of routeResults) {
    const route = result.label.replace('route-', '');
    addCheck(`public route renders ${route}`, result.ok && /<html/i.test(result.text), {
      status: result.status,
      title: (result.text.match(/<title>([^<]+)<\/title>/i) || [])[1] || null,
    });
  }

  const report = {
    ok: checks.every((check) => check.ok),
    site_url: SITE_URL,
    checked_at: checkedAt,
    counts: {
      d1: d1Counts,
      postgres: pgCounts,
      comparisons: countComparisons,
    },
    warnings,
    checks,
  };

  const fs = await import('node:fs');
  const path = await import('node:path');
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});