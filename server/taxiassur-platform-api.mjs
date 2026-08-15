import { createServer } from 'node:http';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';

const env = loadEnv([
  process.env.TAXIASSUR_PLATFORM_ENV_FILE,
  'F:/TaxiAssur/Secrets/taxiassur-platform-api.env',
  'F:/TaxiAssur/Secrets/postgresql.env',
].filter(Boolean));

const config = {
  host: env.TAXIASSUR_PLATFORM_API_HOST || '127.0.0.1',
  port: positiveInt(env.TAXIASSUR_PLATFORM_API_PORT, 8796, 65535),
  dbHost: env.POSTGRES_HOST || '127.0.0.1',
  dbPort: env.POSTGRES_PORT || '5432',
  dbName: env.POSTGRES_DB || 'taxiassur',
  dbUser: env.TAXIASSUR_APP_USER || 'taxiassur_app',
  dbPassword: env.TAXIASSUR_APP_PASSWORD || '',
  psqlPath: env.ASSUR_LOCAL_PSQL_PATH || 'F:/TaxiAssur/PostgreSQL/runtime/pgsql/bin/psql.exe',
  internalToken: env.TAXIASSUR_PLATFORM_API_TOKEN || '',
  documentRoot: env.TAXIASSUR_DOCUMENT_ROOT || 'F:/TaxiAssur/Documents',
  clamScanPath: env.CLAMSCAN_PATH || 'C:/Program Files/ClamAV/clamscan.exe',
  clamDatabasePath: env.CLAMSCAN_DATABASE_PATH || 'F:/TaxiAssur/ClamAV/db',
  allowedOrigins: new Set((env.TAXIASSUR_PLATFORM_ALLOWED_ORIGINS || 'https://taxiassur.com,https://www.taxiassur.com,http://localhost:5173,http://localhost:4173').split(',').map((value) => value.trim().replace(/\/$/, '')).filter(Boolean)),
};

if (!config.dbPassword || config.internalToken.length < 32 || !existsSync(config.psqlPath)) {
  console.error('[taxiassur-platform-api] Invalid database, token, or psql configuration.');
  process.exit(1);
}

const maxUploadBytes = 10 * 1024 * 1024;
const tokenPattern = /^[0-9a-f]{64}$/i;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedMimeTypes = new Map([
  ['application/pdf', 'pdf'], ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'],
]);
const allowedDocumentTypes = new Set(['licence_taxi', 'permis_conduire', 'piece_identite', 'carte_grise', 'releve_information', 'autorisation_stationnement', 'rib', 'kbis', 'carte_pro_vtc', 'inscription_registre_vtc', 'controle_technique', 'autre']);
const rateBuckets = new Map();
mkdirSync(config.documentRoot, { recursive: true });
mkdirSync(path.join(config.documentRoot, '.tmp'), { recursive: true });
mkdirSync(path.join(config.documentRoot, 'quarantine'), { recursive: true });

const server = createServer(async (req, res) => {
  const origin = String(req.headers.origin || '').replace(/\/$/, '');
  const requestId = randomUUID();
  try {
    if (req.method === 'OPTIONS') return send(res, origin, 204, '', {}, requestId);
    if (!originAllowed(origin)) return json(res, origin, 403, { ok: false, error: 'origin_not_allowed' }, requestId);
    if (!takeRateSlot(clientIp(req))) return json(res, origin, 429, { ok: false, error: 'rate_limited' }, requestId);
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, origin, 200, { ok: true, service: 'taxiassur-platform-api', storage: 'local', database: config.dbName, checked_at: new Date().toISOString() }, requestId);
    }
    if (req.method === 'GET' && url.pathname === '/v1/prospect/session') return prospectSession(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/prospect/documents') return uploadProspectDocument(req, res, origin, requestId);
    const downloadMatch = url.pathname.match(/^\/v1\/prospect\/documents\/([0-9a-f-]{36})\/download$/i);
    if (req.method === 'GET' && downloadMatch) return downloadProspectDocument(req, res, origin, requestId, downloadMatch[1]);
    if (url.pathname.startsWith('/v1/internal/') && !internalAuthorized(req)) return json(res, origin, 401, { ok: false, error: 'unauthorized' }, requestId);
    return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  } catch (error) {
    console.error('[taxiassur-platform-api]', { requestId, method: req.method, url: req.url, error: error instanceof Error ? error.message : 'unknown' });
    return json(res, origin, error.statusCode || 500, { ok: false, error: error.publicCode || 'server_error' }, requestId);
  }
});

server.listen(config.port, config.host, () => console.log(`[taxiassur-platform-api] listening on http://${config.host}:${config.port}`));

async function prospectSession(req, res, origin, requestId) {
  const token = prospectToken(req);
  if (!token) return json(res, origin, 401, { ok: false, error: 'invalid_access' }, requestId);
  const lead = await leadByToken(token);
  if (!lead) return json(res, origin, 403, { ok: false, error: 'invalid_access' }, requestId);
  const leadId = String(lead.id || '');
  const [documents, requests, payments] = await Promise.all([
    recordsWhere('prospect_documents', 'lead_id', leadId),
    recordsWhere('crm_document_requests', 'lead_id', leadId),
    recordsWhere('monetico_payments', 'lead_id', leadId),
  ]);
  const safeLead = Object.fromEntries(['id', 'first_name', 'last_name', 'full_name', 'email', 'phone', 'address', 'postal_code', 'city', 'status', 'pipeline_stage', 'document_checklist', 'documents_complete', 'quote_amount', 'can_pay', 'can_sign_contract', 'selected_quote_id', 'contract_signed', 'payment_confirmed'].map((key) => [key, lead[key] ?? null]));
  return json(res, origin, 200, { ok: true, lead: safeLead, documents, document_requests: requests, payments }, requestId);
}

async function uploadProspectDocument(req, res, origin, requestId) {
  const token = prospectToken(req);
  const lead = token ? await leadByToken(token) : null;
  if (!lead || !uuidPattern.test(String(lead.id || ''))) return drainAndJson(req, res, origin, 403, { ok: false, error: 'invalid_access' }, requestId);
  const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const extension = allowedMimeTypes.get(mimeType);
  const documentType = String(req.headers['x-document-type'] || '').trim().toLowerCase();
  const requestIdHeader = String(req.headers['x-document-request-id'] || '').trim();
  const documentRequestId = uuidPattern.test(requestIdHeader) ? requestIdHeader : '';
  const originalName = safeFileName(decodeHeader(req.headers['x-file-name']));
  const declaredSize = Number(req.headers['content-length'] || 0);
  if (!extension || !allowedDocumentTypes.has(documentType) || !originalName || !Number.isInteger(declaredSize) || declaredSize < 1 || declaredSize > maxUploadBytes) {
    return drainAndJson(req, res, origin, 400, { ok: false, error: 'invalid_file' }, requestId);
  }
  const fileId = randomUUID();
  const relativePath = `${lead.id}/prospect/${fileId}.${extension}`;
  const finalPath = safeStoragePath(relativePath);
  const temporaryPath = path.join(config.documentRoot, '.tmp', `${fileId}.upload`);
  mkdirSync(path.dirname(finalPath), { recursive: true });
  const upload = await receiveFile(req, temporaryPath, maxUploadBytes);
  if (upload.size !== declaredSize) {
    safeUnlink(temporaryPath);
    return json(res, origin, 400, { ok: false, error: 'size_mismatch' }, requestId);
  }
  const scan = await scanFile(temporaryPath);
  if (scan.status !== 'clean') {
    const quarantinePath = path.join(config.documentRoot, 'quarantine', `${fileId}.${extension}`);
    renameSync(temporaryPath, quarantinePath);
    await insertFileObject({ id: fileId, leadId: lead.id, documentType, originalName, relativePath: `quarantine/${fileId}.${extension}`, mimeType, size: upload.size, sha256: upload.sha256, scan, status: 'quarantined' });
    return json(res, origin, 422, { ok: false, error: scan.status === 'infected' ? 'infected_file' : 'scan_failed' }, requestId);
  }
  renameSync(temporaryPath, finalPath);
  try {
    await insertFileObject({ id: fileId, leadId: lead.id, documentType, documentRequestId, originalName, relativePath, mimeType, size: upload.size, sha256: upload.sha256, scan, status: 'pending' });
  } catch (error) {
    safeUnlink(finalPath);
    throw error;
  }
  return json(res, origin, 201, { ok: true, document: { id: fileId, document_type: documentType, file_name: originalName, file_size: upload.size, mime_type: mimeType, status: 'pending', uploaded_at: new Date().toISOString() } }, requestId);
}

async function downloadProspectDocument(req, res, origin, requestId, documentId) {
  if (!uuidPattern.test(documentId)) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  const token = prospectToken(req);
  const lead = token ? await leadByToken(token) : null;
  if (!lead) return json(res, origin, 403, { ok: false, error: 'invalid_access' }, requestId);
  const sql = `SELECT jsonb_build_object('id', id, 'storage_path', storage_path, 'original_name', original_name, 'mime_type', mime_type, 'size_bytes', size_bytes, 'scan_status', scan_status)::text FROM taxiassur.file_objects WHERE id = ${quoteLiteral(documentId)}::uuid AND owner_id = ${quoteLiteral(String(lead.id))} AND scan_status = 'clean' LIMIT 1;`;
  const row = parseJsonLine(await runPsql(sql));
  if (!row) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  const filePath = safeStoragePath(row.storage_path);
  if (!existsSync(filePath)) return json(res, origin, 404, { ok: false, error: 'file_missing' }, requestId);
  res.writeHead(200, responseHeaders(origin, requestId, { 'Content-Type': row.mime_type, 'Content-Length': String(row.size_bytes), 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.original_name)}`, 'Cache-Control': 'private, no-store' }));
  createReadStream(filePath).pipe(res);
}

async function leadByToken(token) {
  const sql = `SELECT data::text FROM taxiassur.records WHERE collection = 'crm_leads' AND data ->> 'access_token' = ${quoteLiteral(token)} AND COALESCE(data ->> 'deleted_at', '') = '' LIMIT 1;`;
  return parseJsonLine(await runPsql(sql));
}

async function recordsWhere(collection, field, value) {
  const sql = `SELECT COALESCE(jsonb_agg(data ORDER BY COALESCE(data ->> 'updated_at', data ->> 'created_at', '') DESC), '[]'::jsonb)::text FROM taxiassur.records WHERE collection = ${quoteLiteral(collection)} AND data ->> ${quoteLiteral(field)} = ${quoteLiteral(value)};`;
  return parseJsonLine(await runPsql(sql)) || [];
}

async function insertFileObject(file) {
  const now = new Date().toISOString();
  const document = { id: file.id, lead_id: String(file.leadId), document_type: file.documentType, file_name: file.originalName, file_path: file.relativePath, file_size: file.size, mime_type: file.mimeType, status: file.status, validated: false, uploaded_by: 'prospect', uploaded_at: now, created_at: now, updated_at: now, security_scan_status: file.scan.status, security_scan_engine: 'clamav', security_scan_checked_at: now };
  const sql = `BEGIN;
    INSERT INTO taxiassur.file_objects (id, owner_type, owner_id, document_type, original_name, storage_path, mime_type, size_bytes, sha256_hex, scan_status, scan_engine, scan_checked_at, status)
    VALUES (${quoteLiteral(file.id)}::uuid, 'prospect', ${quoteLiteral(String(file.leadId))}, ${quoteLiteral(file.documentType)}, ${quoteLiteral(file.originalName)}, ${quoteLiteral(file.relativePath)}, ${quoteLiteral(file.mimeType)}, ${file.size}, ${quoteLiteral(file.sha256)}, ${quoteLiteral(file.scan.status)}, 'clamav', now(), ${quoteLiteral(file.status)});
    INSERT INTO taxiassur.records (collection, record_id, data, origin) VALUES ('prospect_documents', ${quoteLiteral(file.id)}, ${quoteLiteral(JSON.stringify(document))}::jsonb, 'local');
    ${file.documentRequestId ? `UPDATE taxiassur.records SET data = data || ${quoteLiteral(JSON.stringify({ statut: 'recu', document_filename: file.originalName, document_url: file.relativePath, updated_at: now }))}::jsonb, updated_at = now(), revision = revision + 1 WHERE collection = 'crm_document_requests' AND record_id = ${quoteLiteral(file.documentRequestId)} AND data ->> 'lead_id' = ${quoteLiteral(String(file.leadId))};` : ''}
    UPDATE taxiassur.records SET data = jsonb_set(data, '{total_uploaded_files}', to_jsonb(COALESCE(NULLIF(data ->> 'total_uploaded_files', '')::integer, 0) + 1), true), updated_at = now(), revision = revision + 1 WHERE collection = 'crm_leads' AND record_id = ${quoteLiteral(String(file.leadId))};
    INSERT INTO taxiassur.audit_events (actor_type, actor_id, action, target_type, target_id, request_id, metadata) VALUES ('prospect', ${quoteLiteral(String(file.leadId))}, 'document_uploaded', 'prospect_document', ${quoteLiteral(file.id)}, ${quoteLiteral(randomUUID())}::uuid, ${quoteLiteral(JSON.stringify({ document_type: file.documentType, size_bytes: file.size, scan_status: file.scan.status }))}::jsonb);
    COMMIT;`;
  await runPsql(sql);
}

function receiveFile(req, destination, limit) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(destination, { flags: 'wx' });
    const hash = createHash('sha256');
    let size = 0;
    let settled = false;
    const fail = (error) => { if (settled) return; settled = true; output.destroy(); safeUnlink(destination); reject(error); };
    req.on('data', (chunk) => { size += chunk.length; if (size > limit) { req.destroy(); return fail(publicError(413, 'file_too_large')); } hash.update(chunk); });
    req.on('error', fail); output.on('error', fail);
    output.on('finish', () => { if (!settled) { settled = true; resolve({ size, sha256: hash.digest('hex') }); } });
    req.pipe(output);
  });
}

function scanFile(filePath) {
  return new Promise((resolve) => {
    if (!existsSync(config.clamScanPath)) return resolve({ status: 'error' });
    const args = ['--no-summary'];
    if (config.clamDatabasePath) args.push(`--database=${config.clamDatabasePath}`);
    args.push(filePath);
    const child = spawn(config.clamScanPath, args, { windowsHide: true, stdio: 'ignore' });
    const timer = setTimeout(() => child.kill(), 60000);
    child.on('error', () => { clearTimeout(timer); resolve({ status: 'error' }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ status: code === 0 ? 'clean' : code === 1 ? 'infected' : 'error' }); });
  });
}

function runPsql(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn(config.psqlPath, ['-X', '-q', '-A', '-t', '-h', config.dbHost, '-p', config.dbPort, '-U', config.dbUser, '-d', config.dbName, '-v', 'ON_ERROR_STOP=1', '-f', '-'], { windowsHide: true, env: { ...process.env, PGPASSWORD: config.dbPassword, PGCLIENTENCODING: 'UTF8', PGOPTIONS: '-c statement_timeout=30000' } });
    let stdout = ''; let stderr = ''; let settled = false;
    const timer = setTimeout(() => { child.kill(); finish(publicError(503, 'database_timeout')); }, 35000);
    function finish(error, output = '') { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(output); }
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); }); child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
    child.on('error', finish); child.on('close', (code) => code === 0 ? finish(null, stdout) : finish(new Error(`psql_${code}:${stderr.slice(0, 300)}`)));
    child.stdin.end(sql);
  });
}

function loadEnv(files) { const result = { ...process.env }; for (const file of files) { if (!existsSync(file)) continue; for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) { const line = raw.trim(); if (!line || line.startsWith('#')) continue; const index = line.indexOf('='); if (index < 1) continue; const key = line.slice(0, index).trim(); let value = line.slice(index + 1).trim(); if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1); if (!(key in result)) result[key] = value; } } return result; }
function quoteLiteral(value) { return `'${String(value ?? '').replace(/'/g, "''")}'`; }
function parseJsonLine(output) { const line = String(output || '').trim().split(/\r?\n/).filter(Boolean).at(-1); return line ? JSON.parse(line) : null; }
function prospectToken(req) { const value = String(req.headers['x-prospect-token'] || '').trim(); return tokenPattern.test(value) ? value.toLowerCase() : ''; }
function internalAuthorized(req) { const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); return secureEqual(auth, config.internalToken); }
function secureEqual(left, right) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }
function decodeHeader(value) { try { return decodeURIComponent(String(value || '')); } catch { return ''; } }
function safeFileName(value) { return String(value || '').normalize('NFKC').replace(/[\x00-\x1f\x7f/\\]/g, '_').trim().slice(0, 180); }
function safeStoragePath(relative) { const root = path.resolve(config.documentRoot); const target = path.resolve(root, relative); if (!target.startsWith(`${root}${path.sep}`)) throw publicError(400, 'invalid_path'); return target; }
function safeUnlink(file) { try { unlinkSync(file); } catch {} }
function originAllowed(origin) { return !origin || config.allowedOrigins.has(origin); }
function clientIp(req) { return String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
function takeRateSlot(ip) { const now = Date.now(); const value = rateBuckets.get(ip) || { start: now, count: 0 }; if (now - value.start > 60000) { value.start = now; value.count = 0; } value.count += 1; rateBuckets.set(ip, value); return value.count <= 120; }
function positiveInt(value, fallback, max) { const number = Number(value); return Number.isInteger(number) && number > 0 && number <= max ? number : fallback; }
function publicError(statusCode, publicCode) { const error = new Error(publicCode); error.statusCode = statusCode; error.publicCode = publicCode; return error; }
function responseHeaders(origin, requestId, extra = {}) { return { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'X-Request-Id': requestId, ...(origin && config.allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Content-Length,X-Prospect-Token,X-Document-Type,X-Document-Request-Id,X-File-Name,Authorization', 'Access-Control-Max-Age': '600' } : {}), ...extra }; }
function send(res, origin, status, body, headers, requestId) { res.writeHead(status, responseHeaders(origin, requestId, headers)); res.end(body); }
function json(res, origin, status, body, requestId) { send(res, origin, status, JSON.stringify(body), { 'Content-Type': 'application/json; charset=utf-8' }, requestId); }
function drainAndJson(req, res, origin, status, body, requestId) { req.resume(); return json(res, origin, status, body, requestId); }
