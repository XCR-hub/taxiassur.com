import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';

const DEFAULT_ENV_FILES = [
  'F:/TaxiAssur/Secrets/taxiassur-postgres-read-api.env',
  'F:/TaxiAssur/Secrets/postgresql.env',
];

const DEFAULT_ALLOWED_TABLES = [
  'blog_posts',
  'city_pages',
  'faq_entries',
  'news_articles',
  'gsc_pages',
  'gsc_queries',
];

const FILTERABLE_FIELDS = new Set([
  'id',
  'slug',
  'status',
  'category',
  'city',
  'title',
  'url',
  'page_url',
  'query',
]);

const SORT_FIELDS = new Set([
  'updated_at',
  'created_at',
  'published_at',
  'date',
  'title',
  'slug',
]);

const env = loadEnv();
const config = {
  port: intEnv('TAXIASSUR_READ_API_PORT', 8791),
  host: env.TAXIASSUR_READ_API_HOST || '127.0.0.1',
  dbHost: env.TAXIASSUR_DB_HOST || '127.0.0.1',
  dbPort: String(env.TAXIASSUR_DB_PORT || '5432'),
  dbName: env.TAXIASSUR_DB_NAME || 'taxiassur',
  dbUser: env.TAXIASSUR_READ_API_DB_USER || 'taxiassur_read_api',
  dbPassword: env.TAXIASSUR_READ_API_DB_PASSWORD || env.PGPASSWORD || '',
  dbSchema: safeIdentifier(env.TAXIASSUR_DB_SCHEMA || 'supabase_rest'),
  psqlPath: env.TAXIASSUR_PSQL_PATH || 'F:/TaxiAssur/PostgreSQL/runtime/pgsql/bin/psql.exe',
  token: env.TAXIASSUR_READ_API_TOKEN || '',
  allowedTables: new Set((env.TAXIASSUR_READ_API_ALLOWED_TABLES || DEFAULT_ALLOWED_TABLES.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(safeIdentifier)),
  allowedOrigins: new Set((env.TAXIASSUR_READ_API_ALLOWED_ORIGINS || 'https://taxiassur.com,https://www.taxiassur.com,http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean)),
  maxLimit: intEnv('TAXIASSUR_READ_API_MAX_LIMIT', 250),
  defaultLimit: intEnv('TAXIASSUR_READ_API_DEFAULT_LIMIT', 50),
  rateWindowMs: intEnv('TAXIASSUR_READ_API_RATE_WINDOW_MS', 60000),
  rateMax: intEnv('TAXIASSUR_READ_API_RATE_MAX', 120),
  cacheTtlMs: intEnv('TAXIASSUR_READ_API_CACHE_TTL_MS', 300000),
  dbStatementTimeoutMs: intEnv('TAXIASSUR_READ_API_STATEMENT_TIMEOUT_MS', 30000),
  psqlTimeoutMs: intEnv('TAXIASSUR_READ_API_PSQL_TIMEOUT_MS', 45000),
};

if (!config.dbPassword) {
  console.error('[taxiassur-postgres-read-api] Missing TAXIASSUR_READ_API_DB_PASSWORD or PGPASSWORD.');
  process.exit(1);
}

if (!config.token || config.token.length < 24) {
  console.error('[taxiassur-postgres-read-api] Missing TAXIASSUR_READ_API_TOKEN or token too short.');
  process.exit(1);
}

if (!existsSync(config.psqlPath)) {
  console.error(`[taxiassur-postgres-read-api] psql not found: ${config.psqlPath}`);
  process.exit(1);
}

const buckets = new Map();
const responseCache = new Map();

const server = createServer(async (req, res) => {
  const started = Date.now();
  const origin = String(req.headers.origin || '').replace(/\/$/, '');

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/platform/health' || url.pathname.startsWith('/platform/v1/')) {
      if (!isOriginAllowed(origin)) {
        return sendJson(res, origin, 403, { ok: false, error: 'origin_not_allowed' });
      }
      return proxyPlatformRequest(req, res, url);
    }

    if (req.method === 'OPTIONS') {
      return sendCors(res, origin, 204, '');
    }

    if (url.pathname === '/health' && req.method === 'GET') {
      return sendJson(res, origin, 200, serviceHealth());
    }

    if (!url.pathname.startsWith('/api/') || req.method !== 'GET') {
      return sendJson(res, origin, 404, { ok: false, error: 'not_found' });
    }

    if (!isOriginAllowed(origin)) {
      return sendJson(res, origin, 403, { ok: false, error: 'origin_not_allowed' });
    }

    if (!isAuthorized(req)) {
      return sendJson(res, origin, 401, { ok: false, error: 'unauthorized' });
    }

    const ip = clientIp(req);
    if (!allowRate(ip, url.pathname)) {
      return sendJson(res, origin, 429, { ok: false, error: 'rate_limited' });
    }

    if (url.pathname === '/api/health') {
      const health = await cachedJson('health', authenticatedHealth);
      return sendJson(res, origin, 200, health);
    }

    if (url.pathname === '/api/tables') {
      const tables = await cachedJson('tables', listTables);
      return sendJson(res, origin, 200, { ok: true, tables });
    }

    if (url.pathname === '/api/read') {
      const table = requiredTable(url.searchParams.get('table'));
      const result = await cachedJson(`read:${url.searchParams.toString()}`, () => readRows(table, url.searchParams));
      return sendJson(res, origin, 200, result);
    }

    if (url.pathname === '/api/item') {
      const table = requiredTable(url.searchParams.get('table'));
      const result = await cachedJson(`item:${url.searchParams.toString()}`, () => readItem(table, url.searchParams));
      return sendJson(res, origin, 200, result);
    }

    return sendJson(res, origin, 404, { ok: false, error: 'not_found' });
  } catch (error) {
    console.error('[taxiassur-postgres-read-api]', {
      error: error.message,
      method: req.method,
      url: req.url,
      ms: Date.now() - started,
    });
    const code = error.statusCode || 500;
    return sendJson(res, origin, code, {
      ok: false,
      error: code >= 500 ? 'server_error' : error.publicMessage || error.message,
    });
  }
});

function proxyPlatformRequest(req, res, url) {
  const upstreamPath = url.pathname.replace(/^\/platform/, '') + url.search;
  const headers = { ...req.headers, host: '127.0.0.1:8796' };
  delete headers['cf-connecting-ip'];
  delete headers['cf-ray'];
  const upstream = httpRequest({ hostname: '127.0.0.1', port: 8796, path: upstreamPath, method: req.method, headers }, (upstreamResponse) => {
    res.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(res);
  });
  upstream.setTimeout(70000, () => upstream.destroy(new Error('platform_api_timeout')));
  upstream.on('error', () => {
    if (!res.headersSent) sendJson(res, '', 503, { ok: false, error: 'platform_api_unavailable' });
    else res.destroy();
  });
  req.pipe(upstream);
}

server.listen(config.port, config.host, () => {
  console.log(`[taxiassur-postgres-read-api] listening on http://${config.host}:${config.port}`);
});

function loadEnv() {
  const out = { ...process.env };
  const files = [process.env.TAXIASSUR_READ_API_ENV_FILE, ...DEFAULT_ENV_FILES].filter(Boolean);
  for (const file of files) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const index = line.indexOf('=');
      if (index <= 0) continue;
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in out)) out[key] = value;
    }
  }
  return out;
}

function intEnv(key, fallback) {
  const value = Number(env[key] || process.env[key]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

function safeIdentifier(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(String(value || ''))) {
    const error = new Error(`Invalid identifier: ${value}`);
    error.statusCode = 400;
    error.publicMessage = 'invalid_identifier';
    throw error;
  }
  return String(value);
}

function quoteIdent(value) {
  return `"${safeIdentifier(value).replace(/"/g, '""')}"`;
}

function quoteLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function requiredTable(value) {
  const table = safeIdentifier(value || '');
  if (!config.allowedTables.has(table)) {
    const error = new Error(`Table not allowed: ${table}`);
    error.statusCode = 403;
    error.publicMessage = 'table_not_allowed';
    throw error;
  }
  return table;
}

function buildFilters(params) {
  const filters = ['data IS NOT NULL'];
  for (const [key, value] of params.entries()) {
    if (value === '') continue;
    if (key === 'status') {
      const statusFilter = buildStatusFilter(value);
      if (statusFilter) filters.push(statusFilter);
      continue;
    }
    if (!FILTERABLE_FIELDS.has(key)) continue;
    filters.push(`data ->> ${quoteLiteral(key)} = ${quoteLiteral(String(value).slice(0, 500))}`);
  }
  return filters.join(' AND ');
}

function buildStatusFilter(value) {
  const status = String(value || '').toLowerCase().slice(0, 50);
  if (!status || status === 'all') return null;

  if (status === 'published') {
    return `(
      lower(COALESCE(data ->> 'status', '')) = 'published'
      OR lower(COALESCE(data ->> 'published', '')) = 'true'
      OR lower(COALESCE(data ->> 'is_published', '')) = 'true'
      OR (NOT (data ? 'status') AND NOT (data ? 'published') AND NOT (data ? 'is_published'))
    )`;
  }

  if (status === 'draft') {
    return `(
      lower(COALESCE(data ->> 'status', '')) = 'draft'
      OR lower(COALESCE(data ->> 'published', '')) = 'false'
      OR lower(COALESCE(data ->> 'is_published', '')) = 'false'
    )`;
  }

  return `lower(COALESCE(data ->> 'status', '')) = ${quoteLiteral(status)}`;
}

function buildOrder(params) {
  const requested = params.get('sort') || 'updated_at';
  const field = SORT_FIELDS.has(requested) ? requested : 'updated_at';
  const direction = String(params.get('direction') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const primary = `COALESCE(data ->> ${quoteLiteral(field)}, data ->> 'created_at', '') ${direction}`;
  const recency = "COALESCE(data ->> 'updated_at', data ->> 'published_at', data ->> 'created_at', '') DESC";
  const stableKey = "COALESCE(data ->> 'slug', data ->> 'id', data ->> 'title', '') ASC";
  return `${primary}, ${recency}, ${stableKey}`;
}

function serviceHealth() {
  return {
    ok: true,
    service: 'taxiassur-postgres-read-api',
    database: config.dbName,
    schema: config.dbSchema,
    cache_entries: responseCache.size,
    checked_at: new Date().toISOString(),
  };
}

async function cachedJson(key, loader) {
  const now = Date.now();
  const existing = responseCache.get(key);
  if (existing?.value && existing.expiresAt > now) return existing.value;
  if (existing?.pending) return existing.pending;

  const pending = loader()
    .then((value) => {
      responseCache.set(key, { value, expiresAt: Date.now() + config.cacheTtlMs });
      trimCache();
      return value;
    })
    .catch((error) => {
      responseCache.delete(key);
      throw error;
    });
  responseCache.set(key, { pending, expiresAt: now + config.cacheTtlMs });
  return pending;
}

function trimCache() {
  if (responseCache.size <= 200) return;
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (!entry.value || entry.expiresAt <= now) responseCache.delete(key);
  }
}

async function authenticatedHealth() {
  const countExpressions = [...config.allowedTables].map((table) => {
    const qualified = `${quoteIdent(config.dbSchema)}.${quoteIdent(table)}`;
    return `${quoteLiteral(table)}, (SELECT count(*) FROM ${qualified})`;
  });
  const sql = `SELECT jsonb_build_object('ok', true, 'database', current_database(), 'schema', ${quoteLiteral(config.dbSchema)}, ${countExpressions.join(', ')})::text;`;
  const output = await runPsql(sql);
  return JSON.parse(lastJsonLine(output) || '{}');
}

async function listTables() {
  const rows = [...config.allowedTables].map((table) => {
    const qualified = `${quoteIdent(config.dbSchema)}.${quoteIdent(table)}`;
    return `SELECT ${quoteLiteral(table)} AS source_table, (SELECT pg_table FROM ${quoteIdent(config.dbSchema)}.table_map WHERE source_table = ${quoteLiteral(table)} LIMIT 1) AS pg_table, (SELECT imported_at FROM ${quoteIdent(config.dbSchema)}.table_map WHERE source_table = ${quoteLiteral(table)} LIMIT 1) AS imported_at, (SELECT count(*) FROM ${qualified})::bigint AS rows`;
  }).join(' UNION ALL ');
  const sql = `SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY source_table), '[]'::jsonb)::text FROM (${rows}) t;`;
  const output = await runPsql(sql);
  return JSON.parse(lastJsonLine(output) || '[]');
}

async function readRows(table, params) {
  const limit = clampInt(params.get('limit'), config.defaultLimit, 1, config.maxLimit);
  const offset = clampInt(params.get('offset'), 0, 0, 100000);
  const qualified = `${quoteIdent(config.dbSchema)}.${quoteIdent(table)}`;
  const where = buildFilters(params);
  const order = buildOrder(params);
  const sql = `
    SELECT jsonb_build_object(
      'ok', true,
      'table', ${quoteLiteral(table)},
      'limit', ${limit},
      'offset', ${offset},
      'items', COALESCE(jsonb_agg(data), '[]'::jsonb)
    )::text
    FROM (
      SELECT data
      FROM ${qualified}
      WHERE ${where}
      ORDER BY ${order}
      LIMIT ${limit}
      OFFSET ${offset}
    ) rows;
  `;
  const output = await runPsql(sql);
  return JSON.parse(lastJsonLine(output) || '{}');
}

async function readItem(table, params) {
  const qualified = `${quoteIdent(config.dbSchema)}.${quoteIdent(table)}`;
  const where = buildFilters(params);
  const order = buildOrder(params);
  const sql = `
    SELECT jsonb_build_object(
      'ok', true,
      'table', ${quoteLiteral(table)},
      'item', (
        SELECT data
        FROM ${qualified}
        WHERE ${where}
        ORDER BY ${order}
        LIMIT 1
      )
    )::text;
  `;
  const output = await runPsql(sql);
  return JSON.parse(lastJsonLine(output) || '{}');
}

function runPsql(sql) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(config.psqlPath, [
      '-X',
      '-q',
      '-A',
      '-t',
      '-h', config.dbHost,
      '-p', config.dbPort,
      '-U', config.dbUser,
      '-d', config.dbName,
      '-v', 'ON_ERROR_STOP=1',
      '-f', '-',
    ], {
      windowsHide: true,
      env: {
        ...process.env,
        PGPASSWORD: config.dbPassword,
        PGCLIENTENCODING: 'UTF8',
        PGOPTIONS: `-c default_transaction_read_only=on -c statement_timeout=${config.dbStatementTimeoutMs}`,
      },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      if (settled) return;
      child.kill();
      finish(new Error(`psql timeout after ${config.psqlTimeoutMs}ms`));
    }, config.psqlTimeoutMs);

    function finish(error, output = '') {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(output);
    }

    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
    child.on('error', finish);
    child.on('close', (code) => {
      if (code !== 0) finish(new Error(`psql exit ${code}: ${stderr.slice(0, 1000)}`));
      else finish(null, stdout);
    });
    child.stdin.end(sql);
  });
}

function lastJsonLine(output) {
  return output.trim().split(/\r?\n/).filter(Boolean).at(-1);
}

function clampInt(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function isAuthorized(req) {
  const auth = String(req.headers.authorization || '');
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const key = String(req.headers['x-api-key'] || bearer || '');
  if (!key) return false;
  const expected = Buffer.from(config.token);
  const received = Buffer.from(key);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  return config.allowedOrigins.has(origin);
}

function allowRate(ip, route) {
  const key = `${ip}|${route}`;
  const now = Date.now();
  const bucket = buckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start > config.rateWindowMs) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  return bucket.count <= config.rateMax;
}

function clientIp(req) {
  const forwarded = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || '';
}

function corsHeaders(origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  if (origin && config.allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
    headers['Access-Control-Allow-Methods'] = 'GET,OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Authorization,Content-Type,X-API-Key';
    headers['Access-Control-Max-Age'] = '600';
  }
  return headers;
}

function sendCors(res, origin, status, body) {
  res.writeHead(status, corsHeaders(origin));
  res.end(body);
}

function sendJson(res, origin, status, payload) {
  res.writeHead(status, corsHeaders(origin));
  res.end(JSON.stringify(payload));
}
