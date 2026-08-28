#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { writeFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const { collectPublicRuntimeConfigIssues, readRuntimeConfigValue } = require('./lib/runtime-public-config.cjs');

const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const COUNT_TOLERANCE = Math.max(0, Number(process.env.PUBLIC_MIRROR_COUNT_TOLERANCE || 5));
const GSC_COUNT_TOLERANCE = Math.max(COUNT_TOLERANCE, Number(process.env.PUBLIC_MIRROR_GSC_COUNT_TOLERANCE || 25));
const REQUIRE_D1_CACHE_METADATA = process.env.REQUIRE_D1_CACHE_METADATA === '1';
const REQUIRE_POSTGRES_IMPORT_METADATA = process.env.REQUIRE_POSTGRES_IMPORT_METADATA === '1';
const MAX_D1_CACHE_AGE_HOURS = Math.max(1, Number(process.env.MAX_D1_CACHE_AGE_HOURS || 26));
const MAX_POSTGRES_IMPORT_AGE_HOURS = Math.max(1, Number(process.env.MAX_POSTGRES_IMPORT_AGE_HOURS || 36));
const EXPECTED_COMMIT_INPUT = process.env.EXPECTED_COMMIT;
const SKIP_COMMIT_CHECK =
  process.env.SKIP_DEPLOY_COMMIT_CHECK === '1' ||
  ['skip', 'none', 'false', '0'].includes(String(EXPECTED_COMMIT_INPUT || '').toLowerCase());
const EXPECTED_COMMIT = SKIP_COMMIT_CHECK ? '' : (EXPECTED_COMMIT_INPUT || currentGitCommit());
const REPORT_PATH = process.env.PRODUCTION_HEALTH_REPORT || '';
const CONTENT_TABLES = ['blog_posts', 'city_pages', 'faq_entries', 'news_articles'];
const GSC_TABLES = ['gsc_pages', 'gsc_queries'];
const ALL_TABLES = [...CONTENT_TABLES, ...GSC_TABLES];
const PRIVATE_CSP_REQUIRED_FRAGMENTS = [
  "default-src 'self'",
  "script-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
];
const PRIVATE_CSP_FORBIDDEN_FRAGMENTS = [
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'doubleclick.net',
  'pinterest.com',
  'facebook.com',
];

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

async function fetchJson(label, url, timeoutMs = 12000, headers = {}) {
  const { controller, timeout } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'cache-control': 'no-cache',
        ...headers,
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
    return { label, ok: response.ok, status: response.status, json, headers: responseHeaders(response.headers) };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(label, url, timeoutMs = 12000) {
  const { controller, timeout } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'text/plain,*/*',
        'cache-control': 'no-cache',
      },
      signal: controller.signal,
    });
    const text = await response.text();
    return { label, ok: response.ok, status: response.status, text, headers: responseHeaders(response.headers) };
  } finally {
    clearTimeout(timeout);
  }
}

async function postJson(label, url, body, headers = {}, timeoutMs = 12000) {
  const { controller, timeout } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { label, ok: response.ok, status: response.status, json, text };
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
    return { label, ok: response.ok, status: response.status, headers: responseHeaders(response.headers) };
  } finally {
    clearTimeout(timeout);
  }
}

function responseHeaders(headers) {
  return Object.fromEntries(Array.from(headers.entries()).map(([name, value]) => [name.toLowerCase(), value]));
}

function responseHeader(fetchResult, name) {
  return fetchResult?.headers?.[name.toLowerCase()] || '';
}

function cacheControlDetails(fetchResult, fragments) {
  const cacheControl = responseHeader(fetchResult, 'cache-control');
  const normalized = cacheControl.toLowerCase();
  const missing = fragments.filter((fragment) => !normalized.includes(fragment.toLowerCase()));
  return {
    status: fetchResult?.status || null,
    cache_control: cacheControl || null,
    missing,
  };
}

function addCacheControlCheck(checks, name, fetchResult, fragments) {
  const details = cacheControlDetails(fetchResult, fragments);
  addCheck(checks, name, fetchResult?.ok && details.missing.length === 0, details);
}

function privateCspDetails(fetchResult) {
  const csp = responseHeader(fetchResult, 'content-security-policy');
  const normalized = csp.toLowerCase();
  return {
    status: fetchResult?.status || null,
    has_csp: Boolean(csp),
    missing: PRIVATE_CSP_REQUIRED_FRAGMENTS.filter((fragment) => !normalized.includes(fragment.toLowerCase())),
    forbidden: PRIVATE_CSP_FORBIDDEN_FRAGMENTS.filter((fragment) => normalized.includes(fragment.toLowerCase())),
  };
}

function addPrivateCspCheck(checks, name, fetchResult) {
  const details = privateCspDetails(fetchResult);
  addCheck(checks, name, fetchResult?.ok && details.has_csp && details.missing.length === 0 && details.forbidden.length === 0, details);
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

function parseIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function ageHours(date) {
  return (Date.now() - date.getTime()) / 3600000;
}

function toleranceForTable(table) {
  return table.startsWith('gsc_') ? GSC_COUNT_TOLERANCE : COUNT_TOLERANCE;
}

function commitMatches(deployed, expected) {
  if (!expected) return true;
  if (!deployed) return false;
  return expected.startsWith(deployed) || deployed.startsWith(expected);
}

function findDirectGoogleTagLoads(html) {
  const matches = html.match(/googletagmanager\.com\/(?:gtm\.js|gtag\/js|ns\.html)|google-analytics\.com/gi) || [];
  return [...new Set(matches)].slice(0, 10);
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
  const homeHtml = await fetchText('home-html', `${SITE_URL}/?ts=${Date.now()}`);
  const directGoogleTagLoads = findDirectGoogleTagLoads(homeHtml.text || '');
  const envConfig = await fetchText('env-config', `${SITE_URL}/env-config.js?ts=${Date.now()}`);
  const [backofficePage, setPasswordPage, clientPage, prospectPage, serviceWorker, registerSw, webManifest] = await Promise.all([
    fetchStatus('backoffice-page', `${SITE_URL}/backoffice?ts=${Date.now()}`),
    fetchStatus('set-password-page', `${SITE_URL}/auth/set-password?ts=${Date.now()}`),
    fetchStatus('client-page', `${SITE_URL}/espace-client?ts=${Date.now()}`),
    fetchStatus('prospect-page', `${SITE_URL}/espace-prospect?ts=${Date.now()}`),
    fetchText('service-worker', `${SITE_URL}/sw.js?ts=${Date.now()}`),
    fetchText('register-sw', `${SITE_URL}/registerSW.js?ts=${Date.now()}`),
    fetchText('web-manifest', `${SITE_URL}/manifest.webmanifest?ts=${Date.now()}`),
  ]);
  const runtimeConfigText = envConfig.text || '';
  const turnstileProvider = readRuntimeConfigValue(runtimeConfigText, 'VITE_CAPTCHA_PROVIDER');
  const turnstileSiteKey = readRuntimeConfigValue(runtimeConfigText, 'VITE_TURNSTILE_SITE_KEY');
  const supabaseUrl = readRuntimeConfigValue(runtimeConfigText, 'VITE_SUPABASE_URL').replace(/\/$/, '');
  const supabaseAnonKey = readRuntimeConfigValue(runtimeConfigText, 'VITE_SUPABASE_ANON_KEY');
  const runtimePublicConfigAudit = collectPublicRuntimeConfigIssues(runtimeConfigText, {
    requireEnvConfig: true,
    requireSupabaseAnonKey: true,
  });
  const nativeApiBase = String(
    process.env.TAXIASSUR_PLATFORM_API_URL || 'https://postgres-read-api.taxiassur.com/platform',
  ).replace(/\/$/, '');
  const nativeHealth = await fetchJson('native-platform-health', `${nativeApiBase}/health`);
  const invalidTurnstile = await postJson(
    'native-turnstile-invalid-token',
    `${nativeApiBase}/v1/public/turnstile/verify`,
    { token: 'invalid', action: 'contact_form' },
  );
  const emptyLead = await postJson(
    'native-empty-lead',
    `${nativeApiBase}/v1/public/leads`,
    { lead: {} },
  );

  addCheck(checks, 'site page /assurance-taxi returns 200', mainPage.ok && mainPage.status === 200, { status: mainPage.status });
  addCheck(checks, 'public HTML does not load Google tags before consent', homeHtml.ok && directGoogleTagLoads.length === 0, {
    status: homeHtml.status,
    matches: directGoogleTagLoads,
  });
  addCheck(checks, 'deploy-info is reachable', deployInfo.ok && deployInfo.json?.commit, {
    status: deployInfo.status,
    commit: deployInfo.json?.commit,
  });
  addCheck(checks, 'deployed commit matches local HEAD', commitMatches(deployInfo.json?.commit, EXPECTED_COMMIT), {
    deployed: deployInfo.json?.commit || null,
    expected: EXPECTED_COMMIT || null,
  });
  addCheck(checks, 'env-config is reachable', envConfig.ok && runtimeConfigText.includes('window.ENV_CONFIG'), {
    status: envConfig.status,
  });
  addCacheControlCheck(checks, 'backoffice page is no-store in Cloudflare', backofficePage, ['no-store']);
  addCacheControlCheck(checks, 'set-password page is no-store in Cloudflare', setPasswordPage, ['no-store']);
  addCacheControlCheck(checks, 'client portal page is no-store in Cloudflare', clientPage, ['no-store']);
  addCacheControlCheck(checks, 'prospect portal page is no-store in Cloudflare', prospectPage, ['no-store']);
  addPrivateCspCheck(checks, 'backoffice page blocks third-party tags with CSP', backofficePage);
  addPrivateCspCheck(checks, 'set-password page blocks third-party tags with CSP', setPasswordPage);
  addPrivateCspCheck(checks, 'client portal page blocks third-party tags with CSP', clientPage);
  addPrivateCspCheck(checks, 'prospect portal page blocks third-party tags with CSP', prospectPage);
  addCacheControlCheck(checks, 'env-config runtime file is no-store in Cloudflare', envConfig, ['no-store']);
  addCacheControlCheck(checks, 'deploy-info runtime file is no-store in Cloudflare', deployInfo, ['no-store']);
  addCacheControlCheck(checks, 'service worker is not sticky cached in Cloudflare', serviceWorker, ['no-cache', 'no-store', 'must-revalidate']);
  addCacheControlCheck(checks, 'registerSW is not sticky cached in Cloudflare', registerSw, ['no-cache', 'no-store', 'must-revalidate']);
  addCacheControlCheck(checks, 'web manifest is revalidated in Cloudflare', webManifest, ['no-cache', 'must-revalidate']);
  addCheck(checks, 'env-config exposes only browser-safe runtime values', runtimePublicConfigAudit.ok, {
    issue_count: runtimePublicConfigAudit.issues.length,
    issues: runtimePublicConfigAudit.issues,
  });
  addCheck(checks, 'Turnstile runtime config is enabled', turnstileProvider === 'turnstile' && /^0x[\w-]+$/.test(turnstileSiteKey), {
    provider: turnstileProvider || null,
    has_site_key: Boolean(turnstileSiteKey),
  });
  const supabasePublicKeyInfo = runtimePublicConfigAudit.supabase_public_key;
  addCheck(checks, 'Supabase runtime config is available for Edge Function probes', Boolean(supabaseUrl && supabaseAnonKey), {
    has_url: Boolean(supabaseUrl),
    has_anon_key: Boolean(supabaseAnonKey),
  });
  addCheck(checks, 'Supabase runtime public key is not server/service_role', supabasePublicKeyInfo.ok, supabasePublicKeyInfo);
  addCheck(checks, 'Native platform API health is OK', nativeHealth.ok && nativeHealth.json?.ok === true, {
    status: nativeHealth.status || null,
    service: nativeHealth.json?.service || null,
  });
  addCheck(checks, 'Native Turnstile rejects invalid tokens server-side', [400, 403].includes(invalidTurnstile?.status) && invalidTurnstile?.json?.success === false, {
    status: invalidTurnstile?.status || null,
    success: invalidTurnstile?.json?.success ?? null,
    error_codes: invalidTurnstile?.json?.error_codes || [],
  });
  addCheck(checks, 'Native public lead endpoint rejects empty leads', emptyLead?.status === 400 && /invalid|incomplet/i.test(emptyLead?.json?.error || ''), {
    status: emptyLead?.status || null,
    error: emptyLead?.json?.error || null,
  });
  addCheck(checks, 'D1 health is OK', d1Health.ok && d1Health.json?.ok === true, {
    status: d1Health.status,
  });

  const d1Metadata = d1Health.json?.metadata || {};
  const d1GeneratedAt = parseIsoDate(d1Metadata.generated_at);
  const d1CacheAgeHours = d1GeneratedAt ? ageHours(d1GeneratedAt) : null;
  addCheck(checks, 'D1 cache metadata is available when required', !REQUIRE_D1_CACHE_METADATA || (d1Metadata.available === true && Boolean(d1GeneratedAt)), {
    required: REQUIRE_D1_CACHE_METADATA,
    available: d1Metadata.available === true,
    generated_at: d1Metadata.generated_at || null,
  });
  addCheck(checks, 'D1 cache metadata is fresh when available', d1Metadata.available !== true || (Boolean(d1GeneratedAt) && d1CacheAgeHours <= MAX_D1_CACHE_AGE_HOURS), {
    available: d1Metadata.available === true,
    generated_at: d1Metadata.generated_at || null,
    age_hours: d1CacheAgeHours === null ? null : Number(d1CacheAgeHours.toFixed(2)),
    max_age_hours: MAX_D1_CACHE_AGE_HOURS,
    imported_rows: d1Metadata.imported_rows ?? null,
  });
  addCheck(checks, 'PostgreSQL public proxy health is OK', postgresHealth.ok && postgresHealth.json?.ok === true, {
    status: postgresHealth.status,
    public_health_ok: postgresHealth.json?.public_health?.ok === true,
  });

  const postgresTableDetails = Array.isArray(postgresHealth.json?.table_details) ? postgresHealth.json.table_details : [];
  const postgresImportAges = postgresTableDetails
    .filter((row) => ALL_TABLES.includes(row.source_table))
    .map((row) => ({
      table: row.source_table,
      imported_at: row.imported_at || null,
      age_hours: parseIsoDate(row.imported_at) ? ageHours(parseIsoDate(row.imported_at)) : null,
    }));
  const postgresImportMetadataComplete = ALL_TABLES.every((table) => postgresImportAges.some((row) => row.table === table && row.age_hours !== null));
  const postgresImportMetadataPresent = postgresImportAges.some((row) => row.age_hours !== null);
  const postgresImportFresh = postgresImportMetadataPresent && postgresImportAges.every((row) => row.age_hours !== null && row.age_hours <= MAX_POSTGRES_IMPORT_AGE_HOURS);
  addCheck(checks, 'PostgreSQL mirror import metadata is available when required', !REQUIRE_POSTGRES_IMPORT_METADATA || postgresImportMetadataComplete, {
    required: REQUIRE_POSTGRES_IMPORT_METADATA,
    tables: postgresImportAges.map((row) => ({ table: row.table, imported_at: row.imported_at })),
  });
  addCheck(checks, 'PostgreSQL imports are fresh when metadata is available', !postgresImportMetadataPresent || postgresImportFresh, {
    max_age_hours: MAX_POSTGRES_IMPORT_AGE_HOURS,
    tables: postgresImportAges.map((row) => ({
      table: row.table,
      imported_at: row.imported_at,
      age_hours: row.age_hours === null ? null : Number(row.age_hours.toFixed(2)),
    })),
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
  const countComparisons = ALL_TABLES.map((table) => {
    const d1Rows = d1[table] ?? 0;
    const postgresRows = pg[table] ?? 0;
    const difference = Math.abs(d1Rows - postgresRows);
    const tolerance = toleranceForTable(table);

    return {
      table,
      d1: d1Rows,
      postgres: postgresRows,
      difference,
      tolerance,
      equal: d1Rows === postgresRows,
      within_tolerance: difference <= tolerance,
    };
  });

  addCheck(checks, 'D1 and PostgreSQL public counts are within tolerance', countComparisons.every((row) => row.within_tolerance), {
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
