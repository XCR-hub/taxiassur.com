#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');
const { once } = require('node:events');

const DEFAULT_BACKUP_BASE =
  process.platform === 'win32'
    ? 'D:\\Nextcloud\\Developpement TAXIASSUR\\backups'
    : path.resolve(process.cwd(), 'backups');

const DEFAULT_OUTPUT = path.join(process.cwd(), 'cloudflare', 'd1', 'generated', 'public-cache.sql');
const MAX_PAYLOAD_CHARS = 90000;

const CONTENT_TABLES = [
  {
    table: 'blog_posts',
    slug: 'slug',
    title: 'title',
    status: 'status',
    category: 'category',
    publishedAt: 'published_at',
    updatedAt: 'updated_at',
    url: (row) => (row.slug ? `/blog/${row.slug}` : null),
  },
  {
    table: 'city_pages',
    slug: 'slug',
    title: 'title',
    status: 'status',
    city: 'city',
    publishedAt: 'published_at',
    updatedAt: 'updated_at',
    url: (row) => (row.slug ? `/${row.slug}` : null),
  },
  {
    table: 'faq_entries',
    title: 'question',
    status: 'status',
    category: 'category',
    publishedAt: 'created_at',
    updatedAt: 'updated_at',
    url: () => '/faq',
  },
  {
    table: 'news_articles',
    slug: 'slug',
    title: 'title',
    status: 'status',
    category: 'category',
    publishedAt: 'published_at',
    updatedAt: 'updated_at',
    url: (row) => (row.slug ? `/actualites/${row.slug}` : null),
  },
];

const GSC_TABLES = [
  {
    table: 'gsc_pages',
    url: 'url',
    date: 'date',
    impressions: 'impressions',
    clicks: 'clicks',
    ctr: 'ctr',
    position: 'position',
  },
  {
    table: 'gsc_queries',
    url: 'page_url',
    query: 'query',
    date: 'date',
    impressions: 'impressions',
    clicks: 'clicks',
    ctr: 'ctr',
    position: 'position',
  },
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

function hasTablesDir(dir) {
  return fs.existsSync(path.join(dir, 'tables'));
}

function findLatestBackupRoot(baseDir) {
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Backup base directory not found: ${baseDir}`);
  }

  const candidates = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('supabase-rest'))
    .map((entry) => path.join(baseDir, entry.name))
    .filter(hasTablesDir)
    .map((dir) => ({ dir, mtimeMs: fs.statSync(dir).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (candidates.length === 0) {
    throw new Error(`No supabase-rest backup with a tables directory found in: ${baseDir}`);
  }

  return candidates[0].dir;
}

function resolveBackupRoot(input) {
  if (input) {
    const resolved = path.resolve(input);
    if (path.basename(resolved).toLowerCase() === 'tables') {
      return path.dirname(resolved);
    }
    if (!hasTablesDir(resolved)) {
      throw new Error(`Backup root must contain a tables directory: ${resolved}`);
    }
    return resolved;
  }

  return findLatestBackupRoot(DEFAULT_BACKUP_BASE);
}

function value(row, key) {
  return key ? row[key] : null;
}

function stableId(table, row) {
  const id = row.id || row.slug || row.url || row.query;
  if (id !== undefined && id !== null && String(id).trim() !== '') {
    return String(id);
  }

  return crypto.createHash('sha1').update(`${table}:${JSON.stringify(row)}`).digest('hex');
}

function sqlText(input) {
  if (input === undefined || input === null) return 'NULL';
  return `'${String(input).replace(/\u0000/g, '').replace(/'/g, "''")}'`;
}

function sqlNumber(input) {
  if (input === undefined || input === null || input === '') return 'NULL';
  const number = Number(input);
  return Number.isFinite(number) ? String(number) : 'NULL';
}

function payloadText(row) {
  return JSON.stringify(row).replace(/\u0000/g, '');
}

async function* readJsonl(filePath) {
  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  const reader = readline.createInterface({ input, crlfDelay: Infinity });

  for await (const line of reader) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    yield JSON.parse(trimmed);
  }
}

async function writeLine(stream, line) {
  if (!stream.write(`${line}\n`)) {
    await once(stream, 'drain');
  }
}

async function importContentTable(stream, backupRoot, config) {
  const filePath = path.join(backupRoot, 'tables', `${config.table}.jsonl`);
  const stats = { table: config.table, imported: 0, skipped: 0, missing: false };
  if (!fs.existsSync(filePath)) {
    stats.missing = true;
    return stats;
  }

  for await (const row of readJsonl(filePath)) {
    const payload = payloadText(row);
    if (payload.length > MAX_PAYLOAD_CHARS) {
      stats.skipped += 1;
      continue;
    }

    const columns = [
      sqlText(config.table),
      sqlText(stableId(config.table, row)),
      sqlText(value(row, config.slug)),
      sqlText(config.url ? config.url(row) : null),
      sqlText(value(row, config.title)),
      sqlText(value(row, config.status)),
      sqlText(value(row, config.category)),
      sqlText(value(row, config.city)),
      sqlText(value(row, config.publishedAt)),
      sqlText(value(row, config.updatedAt)),
      sqlText(payload),
    ];

    await writeLine(
      stream,
      `INSERT OR REPLACE INTO public_content_cache (source_table, source_id, slug, url, title, status, category, city, published_at, updated_at, payload) VALUES (${columns.join(', ')});`,
    );
    stats.imported += 1;
  }

  return stats;
}

async function importGscTable(stream, backupRoot, config) {
  const filePath = path.join(backupRoot, 'tables', `${config.table}.jsonl`);
  const stats = { table: config.table, imported: 0, skipped: 0, missing: false };
  if (!fs.existsSync(filePath)) {
    stats.missing = true;
    return stats;
  }

  for await (const row of readJsonl(filePath)) {
    const payload = payloadText(row);
    if (payload.length > MAX_PAYLOAD_CHARS) {
      stats.skipped += 1;
      continue;
    }

    const columns = [
      sqlText(config.table),
      sqlText(stableId(config.table, row)),
      sqlText(value(row, config.url)),
      sqlText(value(row, config.query)),
      sqlText(value(row, config.date)),
      sqlNumber(value(row, config.impressions)),
      sqlNumber(value(row, config.clicks)),
      sqlNumber(value(row, config.ctr)),
      sqlNumber(value(row, config.position)),
      sqlText(payload),
    ];

    await writeLine(
      stream,
      `INSERT OR REPLACE INTO gsc_metrics_cache (source_table, source_id, url, query, date, impressions, clicks, ctr, position, payload) VALUES (${columns.join(', ')});`,
    );
    stats.imported += 1;
  }

  return stats;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const backupRoot = resolveBackupRoot(args.backup || process.env.TAXIASSUR_SUPABASE_BACKUP_DIR);
  const outputPath = path.resolve(args.out || process.env.TAXIASSUR_D1_IMPORT_FILE || DEFAULT_OUTPUT);

  await fsp.mkdir(path.dirname(outputPath), { recursive: true });

  const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
  await writeLine(stream, '-- Generated by scripts/d1-build-public-cache.cjs');
  await writeLine(stream, `-- Source backup: ${backupRoot.replace(/\\/g, '/')}`);
  await writeLine(stream, `-- Generated at: ${new Date().toISOString()}`);
  await writeLine(stream, 'DELETE FROM public_content_cache;');
  await writeLine(stream, 'DELETE FROM gsc_metrics_cache;');

  const results = [];
  for (const config of CONTENT_TABLES) {
    results.push(await importContentTable(stream, backupRoot, config));
  }
  for (const config of GSC_TABLES) {
    results.push(await importGscTable(stream, backupRoot, config));
  }

  stream.end();
  await once(stream, 'close');

  const summary = {
    backup_root: backupRoot,
    output: outputPath,
    imported_rows: results.reduce((sum, item) => sum + item.imported, 0),
    skipped_rows: results.reduce((sum, item) => sum + item.skipped, 0),
    tables: results,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});