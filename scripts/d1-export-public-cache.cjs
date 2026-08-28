#!/usr/bin/env node

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { once } = require('node:events');

const PAGE_SIZE = 1000;
const DEFAULT_BACKUP_BASE =
  process.platform === 'win32'
    ? 'D:\\Nextcloud\\Developpement TAXIASSUR\\backups'
    : path.resolve(process.cwd(), 'backups');

const PUBLIC_CACHE_TABLES = [
  'blog_posts',
  'city_pages',
  'faq_entries',
  'news_articles',
  'gsc_pages',
  'gsc_queries',
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const eqIndex = arg.indexOf('=');
    if (eqIndex !== -1) {
      args[arg.slice(2, eqIndex)] = arg.slice(eqIndex + 1);
      continue;
    }

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function normalizeNativeContentUrl(value) {
  const trimmed = value.replace(/\/+$/, '');
  return trimmed.endsWith('/v1/public/content') ? trimmed : `${trimmed}/v1/public/content`;
}

function timestampForPath(date = new Date()) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
}

function resolveOutputRoot(input) {
  if (input) return path.resolve(input);
  return path.resolve(DEFAULT_BACKUP_BASE, `native-public-${timestampForPath()}`);
}

async function writeJsonlRows(stream, rows) {
  for (const row of rows) {
    if (!stream.write(`${JSON.stringify(row)}\n`)) {
      await once(stream, 'drain');
    }
  }
}

async function exportTable({ contentUrl, outputRoot, table, pageSize }) {
  const filePath = path.join(outputRoot, 'tables', `${table}.jsonl`);
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });
  let offset = 0;
  let rowCount = 0;

  try {
    while (true) {
      const url = `${contentUrl}/${encodeURIComponent(table)}?limit=${pageSize}&offset=${offset}`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${table}: native content API ${response.status} ${body.slice(0, 500)}`);
      }

      const payload = await response.json();
      const rows = payload?.items;
      if (!payload?.ok || !Array.isArray(rows)) {
        throw new Error(`${table}: native content API did not return an items array.`);
      }

      await writeJsonlRows(stream, rows);
      rowCount += rows.length;

      if (rows.length < pageSize) break;
      offset += pageSize;
    }

    stream.end();
    await once(stream, 'close');
    return { table, status: 'exported', rows: rowCount, file: filePath };
  } catch (error) {
    stream.end();
    await once(stream, 'close').catch(() => {});
    await fsp.rm(filePath, { force: true });
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawUrl = args.url || process.env.TAXIASSUR_NATIVE_PLATFORM_URL || 'https://postgres-read-api.taxiassur.com/platform';
  const pageSize = Number(args['page-size'] || PAGE_SIZE);
  const tables = String(args.tables || PUBLIC_CACHE_TABLES.join(','))
    .split(',')
    .map((table) => table.trim())
    .filter(Boolean);

  if (!rawUrl) throw new Error('Missing TAXIASSUR_NATIVE_PLATFORM_URL.');
  if (!Number.isInteger(pageSize) || pageSize <= 0 || pageSize > 1000) {
    throw new Error('--page-size must be an integer between 1 and 1000.');
  }

  const contentUrl = normalizeNativeContentUrl(rawUrl);
  const outputRoot = resolveOutputRoot(args.out || process.env.TAXIASSUR_D1_PUBLIC_BACKUP_DIR);
  const tablesDir = path.join(outputRoot, 'tables');

  await fsp.rm(outputRoot, { recursive: true, force: true });
  await fsp.mkdir(tablesDir, { recursive: true });

  const results = [];
  for (const table of tables) {
    console.log(`Export ${table}`);
    results.push(await exportTable({ contentUrl, outputRoot, table, pageSize }));
  }

  const manifest = {
    created_at: new Date().toISOString(),
    source: contentUrl,
    source_type: 'taxiassur-native-postgresql',
    backup_root: outputRoot,
    tables: results,
    totals: {
      tables: results.length,
      rows: results.reduce((sum, item) => sum + item.rows, 0),
    },
  };

  await fsp.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ backup_root: outputRoot, tables: manifest.totals.tables, rows: manifest.totals.rows }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
