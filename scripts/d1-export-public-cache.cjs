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

function normalizeRestUrl(value) {
  const trimmed = value.replace(/\/+$/, '');
  return trimmed.endsWith('/rest/v1') ? trimmed : `${trimmed}/rest/v1`;
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
  return path.resolve(DEFAULT_BACKUP_BASE, `supabase-rest-public-${timestampForPath()}`);
}

async function writeJsonlRows(stream, rows) {
  for (const row of rows) {
    if (!stream.write(`${JSON.stringify(row)}\n`)) {
      await once(stream, 'drain');
    }
  }
}

async function exportTable({ restUrl, serviceRoleKey, outputRoot, table, pageSize }) {
  const filePath = path.join(outputRoot, 'tables', `${table}.jsonl`);
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });
  let offset = 0;
  let rowCount = 0;

  try {
    while (true) {
      const url = `${restUrl}/${encodeURIComponent(table)}?select=*&limit=${pageSize}&offset=${offset}`;
      const response = await fetch(url, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${table}: Supabase REST ${response.status} ${body.slice(0, 500)}`);
      }

      const rows = await response.json();
      if (!Array.isArray(rows)) {
        throw new Error(`${table}: Supabase REST did not return an array.`);
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
  const rawUrl = args.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = args.key || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVER_KEY;
  const pageSize = Number(args['page-size'] || PAGE_SIZE);
  const tables = String(args.tables || PUBLIC_CACHE_TABLES.join(','))
    .split(',')
    .map((table) => table.trim())
    .filter(Boolean);

  if (!rawUrl) throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL.');
  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVER_KEY.');
  if (!Number.isInteger(pageSize) || pageSize <= 0 || pageSize > 1000) {
    throw new Error('--page-size must be an integer between 1 and 1000.');
  }

  const restUrl = normalizeRestUrl(rawUrl);
  const outputRoot = resolveOutputRoot(args.out || process.env.TAXIASSUR_D1_PUBLIC_BACKUP_DIR);
  const tablesDir = path.join(outputRoot, 'tables');

  await fsp.rm(outputRoot, { recursive: true, force: true });
  await fsp.mkdir(tablesDir, { recursive: true });

  const results = [];
  for (const table of tables) {
    console.log(`Export ${table}`);
    results.push(await exportTable({ restUrl, serviceRoleKey, outputRoot, table, pageSize }));
  }

  const manifest = {
    created_at: new Date().toISOString(),
    source: restUrl,
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
