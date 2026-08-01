#!/usr/bin/env node

const { readFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_EXPECTED_TABLES = ['blog_posts', 'city_pages', 'faq_entries', 'news_articles', 'gsc_pages', 'gsc_queries'];
const DEFAULT_MIN_ROWS_BY_TABLE = {
  blog_posts: 100,
  city_pages: 100,
  faq_entries: 50,
  news_articles: 500,
  gsc_pages: 100,
  gsc_queries: 100,
};
const MAX_AGE_HOURS = Math.max(1, Number(process.env.MAX_D1_CACHE_AGE_HOURS || 2));
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_D1_API_TOKEN;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || readDatabaseId();

function readDatabaseId() {
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
  return Object.fromEntries(rows.map((row) => [row.source_table, Number(row.rows || 0)]));
}

async function queryD1(sql) {
  if (!ACCOUNT_ID) fail('Missing CLOUDFLARE_ACCOUNT_ID.');
  if (!API_TOKEN) fail('Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_D1_API_TOKEN.');
  if (!DATABASE_ID) fail('Missing Cloudflare D1 database id.');

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${API_TOKEN}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ sql }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || json?.success !== true) {
    fail('Cloudflare D1 query failed.', {
      status: response.status,
      errors: json?.errors || [],
    });
  }

  const firstResult = Array.isArray(json.result) ? json.result[0] : json.result;
  if (firstResult?.success === false) {
    fail('Cloudflare D1 SQL execution failed.', { errors: firstResult.errors || [] });
  }
  return firstResult?.results || [];
}

async function main() {
  const rows = await queryD1(
    "SELECT key, value, updated_at FROM public_cache_metadata WHERE key IN ('generated_at','imported_rows','skipped_rows','tables') ORDER BY key"
  );
  const contentCountRows = await queryD1("SELECT source_table, COUNT(*) AS rows FROM public_content_cache GROUP BY source_table");
  const gscCountRows = await queryD1("SELECT source_table, COUNT(*) AS rows FROM gsc_metrics_cache GROUP BY source_table");
  const actualRowsByTable = rowsBySourceTable([...contentCountRows, ...gscCountRows]);
  const metadata = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const generatedAt = parseDate(metadata.generated_at);
  const importedRows = Number(metadata.imported_rows || 0);
  const tables = String(metadata.tables || '').split(',').filter(Boolean);
  const missingKeys = ['generated_at', 'imported_rows', 'tables'].filter((key) => !metadata[key]);
  const missingTables = DEFAULT_EXPECTED_TABLES.filter((table) => !tables.includes(table));
  const missingCountTables = DEFAULT_EXPECTED_TABLES.filter((table) => !actualRowsByTable[table]);
  const belowMinimumTables = DEFAULT_EXPECTED_TABLES
    .map((table) => ({ table, rows: actualRowsByTable[table] || 0, min_rows: minRowsForTable(table) }))
    .filter((item) => item.rows < item.min_rows);
  const actualImportedRows = Object.values(actualRowsByTable).reduce((sum, rows) => sum + rows, 0);
  const cacheAgeHours = generatedAt ? ageHours(generatedAt) : null;

  if (missingKeys.length > 0) fail('D1 public cache metadata is incomplete.', { missing_keys: missingKeys, rows });
  if (!generatedAt) fail('D1 public cache generated_at is not a valid date.', { generated_at: metadata.generated_at || null });
  if (cacheAgeHours > MAX_AGE_HOURS) {
    fail('D1 public cache metadata is stale.', {
      generated_at: metadata.generated_at,
      age_hours: Number(cacheAgeHours.toFixed(2)),
      max_age_hours: MAX_AGE_HOURS,
    });
  }
  if (!Number.isFinite(importedRows) || importedRows <= 0) fail('D1 public cache imported_rows is invalid.', { imported_rows: metadata.imported_rows || null });
  if (missingTables.length > 0) fail('D1 public cache metadata misses expected tables.', { missing_tables: missingTables, tables });
  if (missingCountTables.length > 0) fail('D1 public cache has no rows for expected tables.', { missing_tables: missingCountTables, counts: actualRowsByTable });
  if (belowMinimumTables.length > 0) fail('D1 public cache table volumes are below minimums.', { below_minimum: belowMinimumTables, counts: actualRowsByTable });
  if (actualImportedRows !== importedRows) {
    fail('D1 public cache metadata imported_rows does not match actual D1 rows.', {
      metadata_imported_rows: importedRows,
      actual_imported_rows: actualImportedRows,
      counts: actualRowsByTable,
    });
  }

  console.log(JSON.stringify({
    ok: true,
    database_id: DATABASE_ID,
    generated_at: metadata.generated_at,
    age_hours: Number(cacheAgeHours.toFixed(2)),
    imported_rows: importedRows,
    actual_imported_rows: actualImportedRows,
    skipped_rows: Number(metadata.skipped_rows || 0),
    counts: actualRowsByTable,
    minimums: Object.fromEntries(DEFAULT_EXPECTED_TABLES.map((table) => [table, minRowsForTable(table)])),
    tables,
  }, null, 2));
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
