#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { writeFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const EXPECTED_COMMIT_INPUT = process.env.EXPECTED_COMMIT;
const SKIP_COMMIT_CHECK =
  process.env.SKIP_DEPLOY_COMMIT_CHECK === '1' ||
  ['skip', 'none', 'false', '0'].includes(String(EXPECTED_COMMIT_INPUT || '').toLowerCase());
const EXPECTED_COMMIT = SKIP_COMMIT_CHECK ? '' : (EXPECTED_COMMIT_INPUT || currentGitCommit());
const REPORT_PATH = process.env.PRODUCTION_HEALTH_REPORT || '';
const CONTENT_TABLES = ['blog_posts', 'city_pages', 'faq_entries', 'news_articles'];
const GSC_TABLES = ['gsc_pages', 'gsc_queries'];
const ALL_TABLES = [...CONTENT_TABLES, ...GSC_TABLES];

function currentGitCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function withTimeout(ms = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

async function fetchJson(label, url, timeoutMs = 12000) {
  const { controller, timeout } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'cache-control': 'no-cache',
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`${label} returned non-JSON response (${response.status})`);
    }
    return { label, ok: response.ok, status: response.status, json };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchStatus(label, url, timeoutMs = 12000) {
  const { controller, timeout } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { 'cache-control': 'no-cache' },
      signal: controller.signal,
    });
    return { label, ok: response.ok, status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}

function d1Counts(d1Health) {
  const out = {};
  for (const row of d1Health?.counts?.public_content_cache || []) {
    out[row.source_table] = Number(row.rows || 0);
  }
  for (const row of d1Health?.counts?.gsc_metrics_cache || []) {
    out[row.source_table] = Number(row.rows || 0);
  }
  return out;
}

function postgresCounts(postgresHealth) {
  const tables = postgresHealth?.tables || {};
  const out = {};
  for (const table of ALL_TABLES) {
    out[table] = Number(tables[table] || 0);
  }
  return out;
}

function addCheck(checks, name, ok, details = {}) {
  checks.push({ name, ok: Boolean(ok), details });
}

function commitMatches(deployed, expected) {
  if (!expected) return true;
  if (!deployed) return false;
  return expected.startsWith(deployed) || deployed.startsWith(expected);
}

async function main() {
  const checkedAt = new Date().toISOString();
  const checks = [];

  const deployInfo = await fetchJson('deploy-info', `${SITE_URL}/deploy-info.json?ts=${Date.now()}`);
  const d1Health = await fetchJson('d1-health', `${SITE_URL}/api/d1/health?ts=${Date.now()}`);
  const postgresHealth = await fetchJson('postgres-public-health', `${SITE_URL}/api/postgres-public/health?ts=${Date.now()}`);
  const d1Sample = await fetchJson('d1-blog-sample', `${SITE_URL}/api/d1/list?table=blog_posts&limit=1&ts=${Date.now()}`);
  const postgresSample = await fetchJson('postgres-blog-sample', `${SITE_URL}/api/postgres-public/list?table=blog_posts&limit=1&ts=${Date.now()}`);
  const mainPage = await fetchStatus('main-page', `${SITE_URL}/assurance-taxi?ts=${Date.now()}`);

  addCheck(checks, 'site page /assurance-taxi returns 200', mainPage.ok && mainPage.status === 200, mainPage);
  addCheck(checks, 'deploy-info is reachable', deployInfo.ok && deployInfo.json?.commit, {
    status: deployInfo.status,
    commit: deployInfo.json?.commit,
  });
  addCheck(checks, 'deployed commit matches local HEAD', commitMatches(deployInfo.json?.commit, EXPECTED_COMMIT), {
    deployed: deployInfo.json?.commit || null,
    expected: EXPECTED_COMMIT || null,
  });
  addCheck(checks, 'D1 health is OK', d1Health.ok && d1Health.json?.ok === true, {
    status: d1Health.status,
  });
  addCheck(checks, 'PostgreSQL public proxy health is OK', postgresHealth.ok && postgresHealth.json?.ok === true, {
    status: postgresHealth.status,
    public_health_ok: postgresHealth.json?.public_health?.ok === true,
  });
  addCheck(checks, 'D1 blog sample is non-empty', d1Sample.ok && Array.isArray(d1Sample.json?.items) && d1Sample.json.items.length > 0, {
    status: d1Sample.status,
    items: d1Sample.json?.items?.length || 0,
  });
  addCheck(checks, 'PostgreSQL blog sample is non-empty', postgresSample.ok && Array.isArray(postgresSample.json?.items) && postgresSample.json.items.length > 0, {
    status: postgresSample.status,
    items: postgresSample.json?.items?.length || 0,
  });

  const d1 = d1Counts(d1Health.json);
  const pg = postgresCounts(postgresHealth.json);
  const countComparisons = ALL_TABLES.map((table) => ({
    table,
    d1: d1[table] ?? 0,
    postgres: pg[table] ?? 0,
    equal: (d1[table] ?? 0) === (pg[table] ?? 0),
  }));

  addCheck(checks, 'D1 and PostgreSQL public counts match', countComparisons.every((row) => row.equal), {
    counts: countComparisons,
  });

  const report = {
    ok: checks.every((check) => check.ok),
    site_url: SITE_URL,
    checked_at: checkedAt,
    expected_commit: EXPECTED_COMMIT || null,
    deployed_commit: deployInfo.json?.commit || null,
    counts: {
      d1,
      postgres: pg,
      comparisons: countComparisons,
    },
    checks,
  };

  if (REPORT_PATH) {
    mkdirSync(path.dirname(path.resolve(REPORT_PATH)), { recursive: true });
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
