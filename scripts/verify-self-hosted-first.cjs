#!/usr/bin/env node

const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const REPORT_PATH = process.env.SELF_HOSTED_FIRST_REPORT || 'reports/self-hosted-first-health.json';
const SKIP_LIVE = process.env.SKIP_LIVE_SELF_HOSTED_CHECK === '1';

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

  const [postgresHealth, postgresSample, d1Health, d1Sample] = await Promise.all([
    fetchJson('postgres-health', `${SITE_URL}/api/postgres-public/health?ts=${Date.now()}`),
    fetchJson('postgres-blog-sample', `${SITE_URL}/api/postgres-public/list?table=blog_posts&limit=1&ts=${Date.now()}`),
    fetchJson('d1-health', `${SITE_URL}/api/d1/health?ts=${Date.now()}`),
    fetchJson('d1-blog-sample', `${SITE_URL}/api/d1/list?table=blog_posts&limit=1&ts=${Date.now()}`),
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
