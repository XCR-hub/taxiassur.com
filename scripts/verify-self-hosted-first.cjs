#!/usr/bin/env node

const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const REPORT_PATH = process.env.SELF_HOSTED_FIRST_REPORT || 'reports/self-hosted-first-health.json';
const SKIP_LIVE = process.env.SKIP_LIVE_SELF_HOSTED_CHECK === '1';

const PUBLIC_SEO_RUNTIME_FILES = [
  'src/lib/content.ts',
  'src/pages/Actualites.tsx',
  'src/pages/NewsArticle.tsx',
  'src/pages/CityPage.tsx',
  'src/components/NewsSection.tsx',
];
const PUBLIC_SEO_PAGE_FILES = PUBLIC_SEO_RUNTIME_FILES.filter((file) => file !== 'src/lib/content.ts');
const PUBLIC_SEO_TABLES = ['blog_posts', 'city_pages', 'faq_entries', 'news_articles'];

const checks = [];
const warnings = [];

function addCheck(name, ok, details = {}) {
  checks.push({ name, ok: Boolean(ok), details });
}

function addWarning(name, details = {}) {
  warnings.push({ name, details });
}

function sourceHeader(headers) {
  return headers?.['x-taxiassur-source'] || null;
}

async function fetchJson(label, url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'cache-control': 'no-cache',
        'user-agent': 'TaxiAssurSelfHostedFirst/1.0',
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (error) {
      return { label, ok: false, status: response.status, json: null, error: error.message, headers: Object.fromEntries(response.headers.entries()) };
    }
    return { label, ok: response.ok, status: response.status, json, headers: Object.fromEntries(response.headers.entries()) };
  } catch (error) {
    return { label, ok: false, status: 0, json: null, error: error.message, headers: {} };
  } finally {
    clearTimeout(timer);
  }
}

function verifyLocalSourceOrder() {
  const helperPath = path.resolve('src/lib/d1-public-cache.ts');
  const source = readFileSync(helperPath, 'utf8');

  addCheck('public helper exposes PostgreSQL endpoint', source.includes("postgres: '/api/postgres-public'"), { file: helperPath });
  addCheck('public helper keeps D1 fallback endpoint', source.includes("d1: '/api/d1'"), { file: helperPath });
  addCheck('default public source order is PostgreSQL then D1', /DEFAULT_SOURCE_ORDER:\s*PublicSourceKey\[\]\s*=\s*\['postgres',\s*'d1'\]/.test(source), { file: helperPath });
  addCheck('runtime public source order is configurable', source.includes('VITE_PUBLIC_CONTENT_SOURCE_ORDER'), { file: helperPath });
  addCheck('public fetch timeout is configurable and bounded', source.includes('VITE_PUBLIC_CONTENT_TIMEOUT_MS') && source.includes('Math.min(10000'), { file: helperPath });
}

function verifyPublicSeoRuntimeNoSupabaseFallback() {
  const directSeoTableFindings = [];
  const missingHelperFindings = [];
  const directClientImports = [];

  for (const relativeFile of PUBLIC_SEO_RUNTIME_FILES) {
    const filePath = path.resolve(relativeFile);
    const fileSource = readFileSync(filePath, 'utf8');
    const usesAutonomousHelper = fileSource.includes('getD1Content') || fileSource.includes('listD1Content');

    if (!usesAutonomousHelper) {
      missingHelperFindings.push({ file: relativeFile });
    }

    for (const table of PUBLIC_SEO_TABLES) {
      const directSupabaseTablePattern = new RegExp("\\.from\\(\\s*['\"`]" + table + "['\"`]\\s*\\)");
      if (directSupabaseTablePattern.test(fileSource)) {
        directSeoTableFindings.push({ file: relativeFile, table });
      }
    }
  }

  for (const relativeFile of PUBLIC_SEO_PAGE_FILES) {
    const filePath = path.resolve(relativeFile);
    const fileSource = readFileSync(filePath, 'utf8');
    if (fileSource.includes('@/lib/supabase') || fileSource.includes("from '@/integrations/supabase/client'")) {
      directClientImports.push({ file: relativeFile });
    }
  }

  addCheck('public SEO runtime uses autonomous public content helper', missingHelperFindings.length === 0, {
    files: PUBLIC_SEO_RUNTIME_FILES,
    findings: missingHelperFindings,
  });
  addCheck('public SEO runtime does not fall back to Supabase SEO tables', directSeoTableFindings.length === 0, {
    tables: PUBLIC_SEO_TABLES,
    findings: directSeoTableFindings,
  });
  addCheck('public SEO pages do not import Supabase client directly', directClientImports.length === 0, {
    files: PUBLIC_SEO_PAGE_FILES,
    findings: directClientImports,
  });
}

function verifyAutonomousSitemapGeneration() {
  const generatorPath = path.resolve('scripts/generate-clean-sitemap.js');
  const optionalPath = path.resolve('scripts/generate-sitemap-optional.js');
  const generatorSource = readFileSync(generatorPath, 'utf8');
  const optionalSource = readFileSync(optionalPath, 'utf8');
  const packagePath = path.resolve('package.json');
  const postgresListPath = path.resolve('functions/api/postgres-public/list.js');
  const d1ListPath = path.resolve('functions/api/d1/list.js');
  const serverReadApiPath = path.resolve('server/postgres-read-api.mjs');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const postgresListSource = readFileSync(postgresListPath, 'utf8');
  const d1ListSource = readFileSync(d1ListPath, 'utf8');
  const serverReadApiSource = readFileSync(serverReadApiPath, 'utf8');
  const buildScript = packageJson.scripts?.build || '';

  addCheck('sitemap generator does not import Supabase client', !generatorSource.includes('@supabase/supabase-js') && !generatorSource.includes('createClient('), {
    file: generatorPath,
  });
  addCheck('sitemap generator reads public PostgreSQL then D1 endpoints', generatorSource.includes('/api/postgres-public') && generatorSource.includes('/api/d1') && generatorSource.includes("DEFAULT_SOURCE_ORDER = ['postgres-public', 'd1']"), {
    file: generatorPath,
  });
  addCheck('optional sitemap build is not gated by Supabase environment', !optionalSource.includes('VITE_SUPABASE_URL') && !optionalSource.includes('SUPABASE'), {
    file: optionalPath,
  });
  const sitemapBuildStep = 'generate-sitemap-optional.js --out dist/sitemap.xml';
  addCheck('production build writes autonomous sitemap to dist after Vite build', buildScript.includes(sitemapBuildStep) && buildScript.indexOf('vite build') >= 0 && buildScript.indexOf('vite build') < buildScript.indexOf(sitemapBuildStep), {
    file: packagePath,
    build: buildScript,
  });
  addCheck('public PostgreSQL list endpoint supports pagination', postgresListSource.includes("url.searchParams.get('offset')") && postgresListSource.includes('nextOffset') && postgresListSource.includes('limit,') && postgresListSource.includes('offset,'), {
    file: postgresListPath,
  });
  addCheck('public D1 list endpoint supports pagination', d1ListSource.includes("url.searchParams.get('offset')") && d1ListSource.includes('LIMIT ? OFFSET ?') && d1ListSource.includes('nextOffset'), {
    file: d1ListPath,
  });
  addCheck('PostgreSQL read API uses stable secondary ordering', serverReadApiSource.includes('stableKey') && serverReadApiSource.includes("data ->> 'slug'") && serverReadApiSource.includes("data ->> 'id'"), {
    file: serverReadApiPath,
  });
  addCheck('sitemap generator paginates public content rows', generatorSource.includes('PUBLIC_LIST_MAX_PAGES') && generatorSource.includes("url.searchParams.set('offset'") && generatorSource.includes('fetchPublicRowsFromSource') && generatorSource.includes('added === 0'), {
    file: generatorPath,
  });
}
function publicItemKey(item) {
  const payload = item?.payload && typeof item.payload === 'object' ? item.payload : {};
  return String(item?.source_id || item?.id || item?.slug || payload.id || payload.slug || '');
}

function rowsFromHealth(json) {
  const tables = json?.tables || {};
  return {
    blog_posts: Number(tables.blog_posts || 0),
    city_pages: Number(tables.city_pages || 0),
    faq_entries: Number(tables.faq_entries || 0),
    news_articles: Number(tables.news_articles || 0),
    gsc_pages: Number(tables.gsc_pages || 0),
    gsc_queries: Number(tables.gsc_queries || 0),
  };
}

async function verifyLiveSources() {
  if (SKIP_LIVE) {
    addWarning('live self-hosted checks skipped', { reason: 'SKIP_LIVE_SELF_HOSTED_CHECK=1' });
    return;
  }

  const [postgresHealth, postgresSample, postgresOffsetSample, d1Health, d1Sample, d1OffsetSample] = await Promise.all([
    fetchJson('postgres-health', `${SITE_URL}/api/postgres-public/health?ts=${Date.now()}`),
    fetchJson('postgres-blog-sample', `${SITE_URL}/api/postgres-public/list?table=blog_posts&limit=1&ts=${Date.now()}`),
    fetchJson('postgres-blog-offset-sample', `${SITE_URL}/api/postgres-public/list?table=blog_posts&limit=1&offset=1&ts=${Date.now()}`),
    fetchJson('d1-health', `${SITE_URL}/api/d1/health?ts=${Date.now()}`),
    fetchJson('d1-blog-sample', `${SITE_URL}/api/d1/list?table=blog_posts&limit=1&ts=${Date.now()}`),
    fetchJson('d1-blog-offset-sample', `${SITE_URL}/api/d1/list?table=blog_posts&limit=1&offset=1&ts=${Date.now()}`),
  ]);

  addCheck('PostgreSQL public API health is OK', postgresHealth.ok && postgresHealth.json?.ok === true, {
    status: postgresHealth.status,
    source: sourceHeader(postgresHealth.headers),
  });
  addCheck('PostgreSQL public API identifies self-hosted source', sourceHeader(postgresHealth.headers) === 'postgres-mirror', {
    source: sourceHeader(postgresHealth.headers),
  });
  addCheck('PostgreSQL public API returns blog content', postgresSample.ok && Array.isArray(postgresSample.json?.items) && postgresSample.json.items.length > 0, {
    status: postgresSample.status,
    source: sourceHeader(postgresSample.headers),
    items: postgresSample.json?.items?.length || 0,
  });
  addCheck('D1 fallback health is OK', d1Health.ok && d1Health.json?.ok === true, {
    status: d1Health.status,
    source: sourceHeader(d1Health.headers),
  });
  addCheck('D1 fallback identifies cache source', sourceHeader(d1Health.headers) === 'd1-cache', {
    source: sourceHeader(d1Health.headers),
  });
  addCheck('D1 fallback returns blog content', d1Sample.ok && Array.isArray(d1Sample.json?.items) && d1Sample.json.items.length > 0, {
    status: d1Sample.status,
    source: sourceHeader(d1Sample.headers),
    items: d1Sample.json?.items?.length || 0,
  });

  const postgresFirstKey = publicItemKey(postgresSample.json?.items?.[0]);
  const postgresOffsetKey = publicItemKey(postgresOffsetSample.json?.items?.[0]);
  addCheck('PostgreSQL public API honors list offset', postgresOffsetSample.ok && postgresFirstKey && postgresOffsetKey && postgresFirstKey !== postgresOffsetKey, {
    status: postgresOffsetSample.status,
    source: sourceHeader(postgresOffsetSample.headers),
  });

  const d1FirstKey = publicItemKey(d1Sample.json?.items?.[0]);
  const d1OffsetKey = publicItemKey(d1OffsetSample.json?.items?.[0]);
  addCheck('D1 fallback honors list offset', d1OffsetSample.ok && d1FirstKey && d1OffsetKey && d1FirstKey !== d1OffsetKey, {
    status: d1OffsetSample.status,
    source: sourceHeader(d1OffsetSample.headers),
  });

  const pgRows = rowsFromHealth(postgresHealth.json);
  const d1Rows = {};
  for (const row of d1Health.json?.counts?.public_content_cache || []) d1Rows[row.source_table] = Number(row.rows || 0);
  for (const row of d1Health.json?.counts?.gsc_metrics_cache || []) d1Rows[row.source_table] = Number(row.rows || 0);

  const compared = Object.keys(pgRows).map((table) => ({
    table,
    postgres: pgRows[table] || 0,
    d1: d1Rows[table] || 0,
    difference: Math.abs((pgRows[table] || 0) - (d1Rows[table] || 0)),
  }));
  addCheck('PostgreSQL and D1 fallback counts are aligned', compared.every((row) => row.difference <= (row.table.startsWith('gsc_') ? 25 : 5)), {
    counts: compared,
  });
}

async function main() {
  verifyLocalSourceOrder();
  verifyPublicSeoRuntimeNoSupabaseFallback();
  verifyAutonomousSitemapGeneration();
  await verifyLiveSources();

  const report = {
    ok: checks.every((check) => check.ok),
    site_url: SITE_URL,
    checked_at: new Date().toISOString(),
    warnings,
    checks,
  };

  mkdirSync(path.dirname(path.resolve(REPORT_PATH)), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
