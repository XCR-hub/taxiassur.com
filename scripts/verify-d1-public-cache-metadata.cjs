#!/usr/bin/env node

const { readFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_EXPECTED_TABLES = ['blog_posts', 'city_pages', 'faq_entries', 'news_articles', 'gsc_pages', 'gsc_queries'];
const DEFAULT_MIN_ROWS_BY_TABLE = {
  blog_posts: 100,
  city_pages: 100,
  faq_entries: 50,
  news_articles: 50,
  gsc_pages: 100,
  gsc_queries: 100,
};

const MAX_AGE_HOURS = Math.max(1, Number(process.env.MAX_D1_CACHE_AGE_HOURS || 2));
const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const FETCH_TIMEOUT_MS = Math.max(1500, Number(process.env.D1_VERIFY_FETCH_TIMEOUT_MS || 12000));
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_D1_API_TOKEN || '';
const EXPLICIT_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || '';
const VERIFY_MODE = normalizeVerifyMode(process.env.D1_VERIFY_MODE || (isTruthy(process.env.D1_VERIFY_REQUIRE_DIRECT) ? 'direct' : 'auto'));

function normalizeVerifyMode(value) {
  const mode = String(value || 'auto').trim().toLowerCase();
  if (['auto', 'direct', 'public'].includes(mode)) return mode;
  fail('Invalid D1_VERIFY_MODE.', { value, expected: ['auto', 'direct', 'public'] });
}

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function readDatabaseId() {
  if (EXPLICIT_DATABASE_ID) return EXPLICIT_DATABASE_ID;
  const wranglerPath = path.resolve('wrangler.toml');
  const source = readFileSync(wranglerPath, 'utf8');
  const match = source.match(/database_id\s*=\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error('database_id not found in wrangler.toml');
  return match[1];
}

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, error: message, ...details }, null, 2));
  process.exit(1);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function ageHours(date) {
  return (Date.now() - date.getTime()) / 3600000;
}

function minRowsForTable(table) {
  const envKey = `MIN_D1_${table.toUpperCase()}_ROWS`;
  const configured = Number(process.env[envKey]);
  if (Number.isFinite(configured) && configured >= 0) return configured;
  return DEFAULT_MIN_ROWS_BY_TABLE[table] || 1;
}

function rowsBySourceTable(rows) {
  return Object.fromEntries((rows || []).map((row) => [row.source_table, Number(row.rows || 0)]));
}

function normalizeTables(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function directMissing() {
  return [
    !ACCOUNT_ID ? 'CLOUDFLARE_ACCOUNT_ID' : null,
    !API_TOKEN ? 'CLOUDFLARE_API_TOKEN or CLOUDFLARE_D1_API_TOKEN' : null,
  ].filter(Boolean);
}

function controller(ms) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), ms);
  return { abort, timer };
}

async function fetchJson(url, options = {}) {
  const { abort, timer } = controller(FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        accept: 'application/json',
        'user-agent': 'TaxiAssurD1MetadataVerifier/1.0',
        ...(options.headers || {}),
      },
      signal: abort.signal,
    });
    const json = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    return { ok: false, status: 0, json: null, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function queryD1(databaseId, sql) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${databaseId}/query`;
  const result = await fetchJson(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${API_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });

  const json = result.json;
  if (!result.ok || json?.success !== true) {
    fail('Cloudflare D1 query failed.', {
      mode: 'direct',
      status: result.status,
      errors: json?.errors || [],
      error: result.error || null,
    });
  }

  const firstResult = Array.isArray(json.result) ? json.result[0] : json.result;
  if (firstResult?.success === false) {
    fail('Cloudflare D1 SQL execution failed.', { mode: 'direct', errors: firstResult.errors || [] });
  }
  return firstResult?.results || [];
}

async function readDirectSnapshot() {
  const missing = directMissing();
  if (missing.length) {
    fail('Missing Cloudflare direct D1 credential(s).', { mode: 'direct', missing });
  }

  const databaseId = readDatabaseId();
  const rows = await queryD1(
    databaseId,
    "SELECT key, value, updated_at FROM public_cache_metadata WHERE key IN ('generated_at','imported_rows','skipped_rows','tables') ORDER BY key"
  );
  const contentCountRows = await queryD1(databaseId, 'SELECT source_table, COUNT(*) AS rows FROM public_content_cache GROUP BY source_table');
  const gscCountRows = await queryD1(databaseId, 'SELECT source_table, COUNT(*) AS rows FROM gsc_metrics_cache GROUP BY source_table');
  const metadata = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    mode: 'direct',
    database_id: databaseId,
    generated_at: metadata.generated_at || null,
    imported_rows_raw: metadata.imported_rows ?? null,
    skipped_rows_raw: metadata.skipped_rows ?? 0,
    tables: normalizeTables(metadata.tables),
    counts: rowsBySourceTable([...contentCountRows, ...gscCountRows]),
    metadata_rows: rows,
  };
}

async function readPublicHealthSnapshot(missingDirect = []) {
  const endpoint = `${SITE_URL}/api/d1/health?verify=${Date.now()}`;
  const result = await fetchJson(endpoint);
  const json = result.json;

  if (!result.ok || json?.ok !== true) {
    fail('Public D1 health endpoint is not OK.', {
      mode: 'public',
      endpoint,
      status: result.status,
      error: result.error || null,
      response_ok: json?.ok ?? null,
    });
  }

  const metadata = json.metadata || {};
  const countGroups = json.counts || {};
  return {
    mode: 'public',
    endpoint,
    database: json.database || null,
    generated_at: metadata.generated_at || null,
    imported_rows_raw: metadata.imported_rows ?? null,
    skipped_rows_raw: metadata.skipped_rows ?? 0,
    tables: normalizeTables(metadata.tables),
    counts: rowsBySourceTable([...(countGroups.public_content_cache || []), ...(countGroups.gsc_metrics_cache || [])]),
    metadata_rows: metadata.rows || [],
    fallback_reason: missingDirect.length ? `missing ${missingDirect.join(', ')}` : null,
  };
}

function validateSnapshot(snapshot) {
  const generatedAt = parseDate(snapshot.generated_at);
  const importedRows = Number(snapshot.imported_rows_raw || 0);
  const skippedRows = Number(snapshot.skipped_rows_raw || 0);
  const actualRowsByTable = snapshot.counts || {};
  const missingKeys = [
    !snapshot.generated_at ? 'generated_at' : null,
    snapshot.imported_rows_raw === null || snapshot.imported_rows_raw === undefined || snapshot.imported_rows_raw === '' ? 'imported_rows' : null,
    snapshot.tables.length === 0 ? 'tables' : null,
  ].filter(Boolean);
  const missingTables = DEFAULT_EXPECTED_TABLES.filter((table) => !snapshot.tables.includes(table));
  const missingCountTables = DEFAULT_EXPECTED_TABLES.filter((table) => !actualRowsByTable[table]);
  const belowMinimumTables = DEFAULT_EXPECTED_TABLES
    .map((table) => ({ table, rows: actualRowsByTable[table] || 0, min_rows: minRowsForTable(table) }))
    .filter((item) => item.rows < item.min_rows);
  const actualImportedRows = Object.values(actualRowsByTable).reduce((sum, rows) => sum + rows, 0);
  const cacheAgeHours = generatedAt ? ageHours(generatedAt) : null;

  if (missingKeys.length > 0) fail('D1 public cache metadata is incomplete.', { mode: snapshot.mode, missing_keys: missingKeys, rows: snapshot.metadata_rows });
  if (!generatedAt) fail('D1 public cache generated_at is not a valid date.', { mode: snapshot.mode, generated_at: snapshot.generated_at || null });
  if (cacheAgeHours > MAX_AGE_HOURS) {
    fail('D1 public cache metadata is stale.', {
      mode: snapshot.mode,
      generated_at: snapshot.generated_at,
      age_hours: Number(cacheAgeHours.toFixed(2)),
      max_age_hours: MAX_AGE_HOURS,
    });
  }
  if (!Number.isFinite(importedRows) || importedRows <= 0) fail('D1 public cache imported_rows is invalid.', { mode: snapshot.mode, imported_rows: snapshot.imported_rows_raw || null });
  if (missingTables.length > 0) fail('D1 public cache metadata misses expected tables.', { mode: snapshot.mode, missing_tables: missingTables, tables: snapshot.tables });
  if (missingCountTables.length > 0) fail('D1 public cache has no rows for expected tables.', { mode: snapshot.mode, missing_tables: missingCountTables, counts: actualRowsByTable });
  if (belowMinimumTables.length > 0) fail('D1 public cache table volumes are below minimums.', { mode: snapshot.mode, below_minimum: belowMinimumTables, counts: actualRowsByTable });
  if (actualImportedRows !== importedRows) {
    fail('D1 public cache metadata imported_rows does not match actual D1 rows.', {
      mode: snapshot.mode,
      metadata_imported_rows: importedRows,
      actual_imported_rows: actualImportedRows,
      counts: actualRowsByTable,
    });
  }

  return {
    ok: true,
    mode: snapshot.mode,
    database_id: snapshot.database_id || null,
    database: snapshot.database || null,
    endpoint: snapshot.endpoint || null,
    fallback_reason: snapshot.fallback_reason || null,
    generated_at: snapshot.generated_at,
    age_hours: Number(cacheAgeHours.toFixed(2)),
    imported_rows: importedRows,
    actual_imported_rows: actualImportedRows,
    skipped_rows: skippedRows,
    counts: actualRowsByTable,
    minimums: Object.fromEntries(DEFAULT_EXPECTED_TABLES.map((table) => [table, minRowsForTable(table)])),
    tables: snapshot.tables,
  };
}

async function readSnapshot() {
  if (VERIFY_MODE === 'public') return readPublicHealthSnapshot();
  const missing = directMissing();
  if (VERIFY_MODE === 'direct' || missing.length === 0) return readDirectSnapshot();
  return readPublicHealthSnapshot(missing);
}

async function main() {
  const snapshot = await readSnapshot();
  console.log(JSON.stringify(validateSnapshot(snapshot), null, 2));
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error), { mode: VERIFY_MODE }));
