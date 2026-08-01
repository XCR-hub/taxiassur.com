#!/usr/bin/env node

const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const REPORT_PATH = process.env.PUBLICATION_HEALTH_REPORT || 'reports/publication-automation-health.json';
const COUNT_TOLERANCE = Math.max(0, Number(process.env.PUBLIC_MIRROR_COUNT_TOLERANCE || 5));
const GSC_COUNT_TOLERANCE = Math.max(COUNT_TOLERANCE, Number(process.env.PUBLIC_MIRROR_GSC_COUNT_TOLERANCE || 25));
const SEO_MAP_MIN_ROUTES = Math.max(1, Number(process.env.PUBLICATION_HEALTH_SEO_MAP_MIN_ROUTES || 300));

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

function toleranceForTable(table) {
  return table.startsWith('gsc_') ? GSC_COUNT_TOLERANCE : COUNT_TOLERANCE;
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

function parseIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function ageHours(date) {
  return (Date.now() - date.getTime()) / 3600000;
}

function d1FreshnessFromHealth(json) {
  const metadata = json?.metadata || {};
  const generatedAt = parseIsoDate(metadata.generated_at);
  return {
    available: metadata.available === true,
    generated_at: metadata.generated_at || null,
    age_hours: generatedAt ? Number(ageHours(generatedAt).toFixed(2)) : null,
    imported_rows: metadata.imported_rows ?? null,
  };
}

function postgresFreshnessFromHealth(json) {
  const details = {};
  const tableDetails = Array.isArray(json?.table_details) ? json.table_details : [];
  for (const row of tableDetails) {
    if (!row?.source_table) continue;
    const importedAt = row.imported_at || null;
    const importedDate = parseIsoDate(importedAt);
    details[row.source_table] = {
      imported_at: importedAt,
      age_hours: importedDate ? Number(ageHours(importedDate).toFixed(2)) : null,
    };
  }
  return details;
}

function freshnessForComparison(table, d1Freshness, postgresFreshness) {
  const d1GeneratedAt = parseIsoDate(d1Freshness.generated_at);
  const postgresImportedAt = parseIsoDate(postgresFreshness[table]?.imported_at);
  const sourceLagMinutes = d1GeneratedAt && postgresImportedAt
    ? Math.round((d1GeneratedAt.getTime() - postgresImportedAt.getTime()) / 60000)
    : null;
  return {
    d1_generated_at: d1Freshness.generated_at,
    postgres_imported_at: postgresFreshness[table]?.imported_at || null,
    source_lag_minutes: sourceLagMinutes,
  };
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
    const pathname = new URL(pathOrUrl, SITE_URL).pathname;
    try {
      return decodeURIComponent(pathname);
    } catch {
      return pathname;
    }
  } catch {
    return null;
  }
}

function seoMapRoutes(map) {
  return Object.entries(map?.routes || {}).filter(([, entry]) => entry?.title && entry?.description);
}

function dynamicSeoSampleRoutes(map) {
  const routes = Object.keys(map?.routes || {});
  return [
    routes.find((route) => route.startsWith('/actualites/')),
    routes.find((route) => route.startsWith('/blog/')),
    routes.find((route) => route.startsWith('/assurance-taxi-')),
  ].filter(Boolean);
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)));
}

function titleOf(html) {
  const match = String(html || '').match(/<title>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1]).replace(/\s+/g, ' ').trim() : '';
}

function hasEdgeSeoMarker(html) {
  return String(html || '').includes('name="taxiassur:seo-edge"') || String(html || '').includes("name='taxiassur:seo-edge'");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifySeoMappedRouteTitle(route, expectedTitle) {
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await fetchText(`seo-route-${route}`, `${SITE_URL}${route}?publication-seo=${Date.now()}-${attempt}`);
    const pageTitle = titleOf(result.text);
    last = {
      matched: result.ok && pageTitle === expectedTitle && hasEdgeSeoMarker(result.text),
      status: result.status,
      title: pageTitle || null,
      edge_marker: hasEdgeSeoMarker(result.text),
      attempt,
    };
    if (last.matched) return last;
    if (attempt < 3) await sleep(300);
  }
  return last || { matched: false, status: 0, title: null, edge_marker: false, attempt: 0 };
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

  const [d1Health, postgresHealth, sitemap, robots, seoContentMap] = await Promise.all([
    fetchJson('d1-health', `${SITE_URL}/api/d1/health?ts=${Date.now()}`),
    fetchJson('postgres-health', `${SITE_URL}/api/postgres-public/health?ts=${Date.now()}`),
    fetchText('sitemap', `${SITE_URL}/sitemap.xml?ts=${Date.now()}`),
    fetchText('robots', `${SITE_URL}/robots.txt?ts=${Date.now()}`),
    fetchJson('seo-content-map', `${SITE_URL}/seo-content-map.json?ts=${Date.now()}`),
  ]);

  addCheck('D1 public cache health is OK', d1Health.ok && d1Health.json?.ok === true, { status: d1Health.status });
  addCheck('PostgreSQL public mirror health is OK', postgresHealth.ok && postgresHealth.json?.ok === true, { status: postgresHealth.status });
  addCheck('sitemap.xml is reachable', sitemap.ok && sitemap.text.includes('<urlset'), { status: sitemap.status });
  addCheck('robots.txt is reachable and exposes sitemap', robots.ok && /Sitemap:\s*https:\/\/taxiassur\.com\/sitemap\.xml/i.test(robots.text), { status: robots.status });
  addCheck('SEO content map is reachable JSON', seoContentMap.ok && Boolean(seoContentMap.json?.routes), {
    status: seoContentMap.status,
    parse_error: seoContentMap.parse_error || null,
  });

  const seoRoutes = seoMapRoutes(seoContentMap.json);
  addCheck('SEO content map has enough dynamic routes', seoRoutes.length >= SEO_MAP_MIN_ROUTES, {
    routes: seoRoutes.length,
    min: SEO_MAP_MIN_ROUTES,
  });
  addCheck('SEO content map includes blog metadata', seoRoutes.some(([route]) => route.startsWith('/blog/')), {});
  addCheck('SEO content map includes news metadata', seoRoutes.some(([route]) => route.startsWith('/actualites/')), {});
  addCheck('SEO content map includes city metadata', seoRoutes.some(([route]) => route.startsWith('/assurance-taxi-')), {});
  addCheck('SEO content map descriptions are populated', seoRoutes.every(([, entry]) => String(entry.description || '').trim().length >= 50), {
    routes: seoRoutes.length,
  });

  const d1Counts = rowsFromD1Health(d1Health.json);
  const pgCounts = rowsFromPostgresHealth(postgresHealth.json);
  const d1Freshness = d1FreshnessFromHealth(d1Health.json);
  const postgresFreshness = postgresFreshnessFromHealth(postgresHealth.json);
  const countComparisons = Object.keys(REQUIRED_COUNTS).map((table) => {
    const d1Rows = d1Counts[table] || 0;
    const postgresRows = pgCounts[table] || 0;
    const difference = Math.abs(d1Rows - postgresRows);
    const tolerance = toleranceForTable(table);

    return {
      table,
      d1: d1Rows,
      postgres: postgresRows,
      min: REQUIRED_COUNTS[table],
      difference,
      tolerance,
      equal: d1Rows === postgresRows,
      within_tolerance: difference <= tolerance,
      enough: d1Rows >= REQUIRED_COUNTS[table] && postgresRows >= REQUIRED_COUNTS[table],
      ...freshnessForComparison(table, d1Freshness, postgresFreshness),
    };
  });

  for (const row of countComparisons) {
    addCheck(`${row.table} public volume is sufficient`, row.enough, row);
    addCheck(`${row.table} D1/PostgreSQL counts are within tolerance`, row.within_tolerance, row);
    if (!row.equal && row.within_tolerance) {
      const postgresBehindD1 = row.d1 > row.postgres && row.source_lag_minutes !== null && row.source_lag_minutes > 0;
      addWarning(
        postgresBehindD1
          ? `${row.table} PostgreSQL mirror is behind D1 within tolerance`
          : `${row.table} D1/PostgreSQL counts differ within tolerance`,
        row,
      );
    }
  }

  const locs = Array.from(sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)).map((match) => match[1]);
  const locPaths = new Set(locs.map((loc) => normalizePath(loc)).filter(Boolean));
  addCheck('sitemap contains at least 800 URLs', locs.length >= 800, { urls: locs.length });
  addCheck('sitemap includes blog URLs', locs.some((url) => url.includes('/blog/')), { sample: locs.find((url) => url.includes('/blog/')) || null });
  addCheck('sitemap includes news URLs', locs.some((url) => url.includes('/actualites/')), { sample: locs.find((url) => url.includes('/actualites/')) || null });
  const cityLocSample = Array.from(locPaths).find((route) => /^\/assurance-taxi-[^/]+$/i.test(route) && !['/assurance-taxi-vtc', '/assurance-taxi-solly-azar'].includes(route));
  addCheck('sitemap includes city URLs', Boolean(cityLocSample), { sample: cityLocSample ? `${SITE_URL}${cityLocSample}` : null });
  addCheck('sitemap includes FAQ index', locs.includes(`${SITE_URL}/faq`), {});
  addCheck('sitemap has no over-encoded percent URLs', locs.every((url) => !/%25/i.test(url)), {
    sample: locs.find((url) => /%25/i.test(url)) || null,
  });
  addCheck('SEO content map routes are present in sitemap', seoRoutes.every(([route]) => locPaths.has(route)), {
    routes: seoRoutes.length,
    missing_sample: seoRoutes.find(([route]) => !locPaths.has(route))?.[0] || null,
  });

  const latestRoutes = new Set(CORE_ROUTES);
  const seoExpectedTitles = new Map();
  for (const route of dynamicSeoSampleRoutes(seoContentMap.json)) {
    latestRoutes.add(route);
    seoExpectedTitles.set(route, seoContentMap.json.routes[route].title);
  }
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
      title: titleOf(result.text) || null,
    });
  }

  for (const [route, expectedTitle] of seoExpectedTitles) {
    const result = await verifySeoMappedRouteTitle(route, expectedTitle);
    addCheck(`public route uses SEO content map title ${route}`, result.matched, {
      expected: expectedTitle,
      actual: result.title,
      status: result.status,
      edge_marker: result.edge_marker,
      attempts: result.attempt,
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
    freshness: {
      d1: d1Freshness,
      postgres: postgresFreshness,
    },
    seo_content_map: {
      routes: seoRoutes.length,
      sample_routes: Array.from(seoExpectedTitles.keys()),
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