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

const MANUAL_TABLES = [
  'automation_logs',
  'backlink_opportunities',
  'blog_posts',
  'city_pages',
  'client_portal_users',
  'code_publish_queue',
  'content_schedule',
  'crm_automation_rules',
  'crm_interactions',
  'crm_lead_documents',
  'crm_leads',
  'crm_quotes',
  'crm_vehicles',
  'documents',
  'email_attachments',
  'email_conversations',
  'email_messages',
  'email_queue',
  'faq_entries',
  'french_cities',
  'gsc_autonomous_tasks',
  'gsc_optimization_history',
  'gsc_pages',
  'gsc_queries',
  'gsc_seo_cron_log',
  'gsc_sync_history',
  'lead_company_quotes',
  'lead_contracts',
  'monetico_payments',
  'news_articles',
  'notification_queue',
  'offers',
  'partner_prospects',
  'pipeline_action_queue',
  'reviews',
  'sms_queue',
  'social_media_posts',
  'system_config',
  'system_settings',
];

const TABLE_EXCLUDES = new Set([
  'auth',
  'cron',
  'net',
  'new',
  'not',
  'old',
  'public',
  'select',
  'set',
  'storage',
  'values',
  'where',
  'with',
]);

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

function projectRefFromUrl(restUrl) {
  const match = restUrl.match(/^https?:\/\/([^.]+)\.supabase\.co(?:\/|$)/i);
  return match ? match[1] : null;
}

function timestampForPath(date = new Date()) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
}

function collectFiles(rootDir, extensions, ignoredDirs = new Set()) {
  const results = [];
  if (!fs.existsSync(rootDir)) return results;

  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function addTableName(target, value) {
  if (!value) return;
  const table = value.replace(/^public\./, '').replace(/"/g, '').trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) return;
  if (TABLE_EXCLUDES.has(table.toLowerCase())) return;
  target.add(table);
}

function discoverTables(repoRoot) {
  const tables = new Set(MANUAL_TABLES);
  const sourceDirs = ['supabase', 'src', 'scripts'];
  const extensions = new Set(['.cjs', '.js', '.jsx', '.mjs', '.sql', '.ts', '.tsx']);
  const ignoredDirs = new Set(['.git', 'dist', 'node_modules', 'playwright-report']);

  for (const dir of sourceDirs) {
    const files = collectFiles(path.join(repoRoot, dir), extensions, ignoredDirs);
    for (const filePath of files) {
      let content;
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      for (const match of content.matchAll(/\.from\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]\s*\)/g)) {
        addTableName(tables, match[1]);
      }

      const sqlPattern =
        /\b(?:create\s+table(?:\s+if\s+not\s+exists)?|alter\s+table|insert\s+into|update)\s+(?:only\s+)?(?:(?:"?public"?|public)\.)?["`]?([a-zA-Z_][a-zA-Z0-9_]*)["`]?/gi;
      for (const match of content.matchAll(sqlPattern)) {
        addTableName(tables, match[1]);
      }
    }
  }

  return [...tables].sort((a, b) => a.localeCompare(b));
}

async function writeJsonlRows(stream, rows) {
  for (const row of rows) {
    if (!stream.write(`${JSON.stringify(row)}\n`)) {
      await once(stream, 'drain');
    }
  }
}

async function exportTable({ restUrl, serviceRoleKey, outputDir, table }) {
  const filePath = path.join(outputDir, 'tables', `${table}.jsonl`);
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });
  let offset = 0;
  let rowCount = 0;

  try {
    while (true) {
      const url = `${restUrl}/${encodeURIComponent(table)}?select=*&limit=${PAGE_SIZE}&offset=${offset}`;
      const response = await fetch(url, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        stream.end();
        await once(stream, 'close');
        await fsp.rm(filePath, { force: true });
        return {
          table,
          status: 'skipped',
          http_status: response.status,
          message: body.slice(0, 500),
          rows: 0,
        };
      }

      const rows = await response.json();
      if (!Array.isArray(rows)) {
        stream.end();
        await once(stream, 'close');
        await fsp.rm(filePath, { force: true });
        return {
          table,
          status: 'skipped',
          message: 'Supabase REST did not return an array.',
          rows: 0,
        };
      }

      await writeJsonlRows(stream, rows);
      rowCount += rows.length;

      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    stream.end();
    await once(stream, 'close');
    return { table, status: 'exported', rows: rowCount, file: filePath };
  } catch (error) {
    stream.end();
    await once(stream, 'close').catch(() => {});
    await fsp.rm(filePath, { force: true });
    return {
      table,
      status: 'skipped',
      message: error instanceof Error ? error.message : String(error),
      rows: 0,
    };
  }
}

async function copyIfExists(repoRoot, relativeSource, destinationRoot) {
  const source = path.join(repoRoot, relativeSource);
  if (!fs.existsSync(source)) return false;

  const destination = path.join(destinationRoot, relativeSource);
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  await fsp.cp(source, destination, { recursive: true });
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawUrl = args.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = args.key || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl) {
    throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL.');
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  }

  const repoRoot = process.cwd();
  const restUrl = normalizeRestUrl(rawUrl);
  const backupBase = args.out || process.env.TAXIASSUR_BACKUP_DIR || DEFAULT_BACKUP_BASE;
  const backupRoot = path.resolve(backupBase, `supabase-rest-${timestampForPath()}`);
  const tablesDir = path.join(backupRoot, 'tables');
  const schemaDir = path.join(backupRoot, 'schema-and-functions');

  await fsp.mkdir(tablesDir, { recursive: true });
  await fsp.mkdir(schemaDir, { recursive: true });

  const tables = discoverTables(repoRoot);
  const results = [];
  for (const table of tables) {
    results.push(await exportTable({ restUrl, serviceRoleKey, outputDir: backupRoot, table }));
  }

  const copied = [];
  for (const relativeSource of ['supabase/migrations', 'supabase/functions', '.github/workflows']) {
    if (await copyIfExists(repoRoot, relativeSource, schemaDir)) {
      copied.push(relativeSource);
    }
  }

  const exported = results.filter((item) => item.status === 'exported');
  const skipped = results.filter((item) => item.status === 'skipped');
  const manifest = {
    created_at: new Date().toISOString(),
    source: restUrl,
    project_ref: projectRefFromUrl(restUrl),
    backup_root: backupRoot,
    note:
      'REST logical export. Does not replace pg_dump for auth/storage internals, roles, policies, extensions, triggers, or realtime metadata.',
    copied_sources: copied,
    tables: results,
    totals: {
      candidates: tables.length,
      exported: exported.length,
      skipped: skipped.length,
      rows: exported.reduce((sum, item) => sum + item.rows, 0),
    },
  };

  await fsp.writeFile(path.join(backupRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        backup_root: backupRoot,
        exported_tables: manifest.totals.exported,
        skipped_tables: manifest.totals.skipped,
        rows: manifest.totals.rows,
        manifest: path.join(backupRoot, 'manifest.json'),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});