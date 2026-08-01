#!/usr/bin/env node

const { readFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_EXPECTED_TABLES = ['blog_posts', 'city_pages', 'faq_entries', 'news_articles', 'gsc_pages', 'gsc_queries'];
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
  const metadata = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const generatedAt = parseDate(metadata.generated_at);
  const importedRows = Number(metadata.imported_rows || 0);
  const tables = String(metadata.tables || '').split(',').filter(Boolean);
  const missingKeys = ['generated_at', 'imported_rows', 'tables'].filter((key) => !metadata[key]);
  const missingTables = DEFAULT_EXPECTED_TABLES.filter((table) => !tables.includes(table));
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

  console.log(JSON.stringify({
    ok: true,
    database_id: DATABASE_ID,
    generated_at: metadata.generated_at,
    age_hours: Number(cacheAgeHours.toFixed(2)),
    imported_rows: importedRows,
    skipped_rows: Number(metadata.skipped_rows || 0),
    tables,
  }, null, 2));
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
